import { Fragment, useEffect, useState } from "react";
import { Box, Button, IconButton, Tooltip, Typography, type SxProps, type Theme } from "@mui/material";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ErrorAlert, SuccessAlert } from "@ehfuse/alerts";
import { formatNumber } from "./utils/numberFormat";
import { computeOperator, hasOperator, parseExpressionState, type CalcOperator } from "./calculatorExpression";

/** 계산기(calculator variant) 입력/연산 상한(정수 범위). */
const CALCULATOR_MAX = 999_999_999_999;

/** 물리 키보드 문자 → 계산기 연산자 매핑(자판 +, -, *, x, / 를 모두 허용). */
const OPERATOR_KEY_MAP: Record<string, CalcOperator> = {
    "+": "+",
    "-": "−",
    "*": "×",
    x: "×",
    X: "×",
    "/": "÷",
};

/** 숫자 행 순서 프리셋. ascending(기본, 1·2·3 이 위) | descending(7·8·9 이 위 — 표준 계산기/숫자 키패드 순서). */
const DIGIT_ROWS: Record<"ascending" | "descending", number[][]> = {
    ascending: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
    ],
    descending: [
        [7, 8, 9],
        [4, 5, 6],
        [1, 2, 3],
    ],
};

/** 공용 props. variant="numpad"(기본, controlled value/onChange) | "calculator"(사칙연산 포함, 내부 상태 자체 관리). */
export interface NumberKeypadProps {
    /** 동작 모드. 기본 "numpad" — 숫자만 입력받는 컨트롤드 위젯. */
    variant?: "numpad" | "calculator";
    /** 숫자 행 순서. 기본 "ascending"(1·2·3 이 위). "descending"(7·8·9 이 위)은 계산기가 사용. */
    digitOrder?: "ascending" | "descending";
    /** numpad: 현재 숫자 값(필수). calculator 모드에서는 쓰지 않는다. */
    value?: number;
    /** numpad: 값이 바뀔 때 호출(클램프 적용된 결과). */
    onChange?: (next: number) => void;
    /** 최소값(기본 0, numpad 전용). */
    min?: number;
    /** 최대값(numpad 전용). */
    max?: number;
    /** 전체 박스에 추가할 스타일. */
    sx?: SxProps<Theme>;
    /** 버튼 높이(px, 기본 76). numpad 는 fillHeight 가 true 면 무시된다. */
    buttonHeight?: number;
    /** 숫자 폰트 크기(기본 "2rem"). calculator 의 연산자 폰트는 이 값의 0.75배로 따라간다. */
    fontSize?: number | string;
    /** true 면 키패드가 부모 높이를 가득 채우도록 4행을 균등 분배한다(numpad 전용). */
    fillHeight?: boolean;
    /** 컨테이너 좌우 패딩(MUI spacing 단위). 기본값은 numpad 0, calculator 2. */
    px?: number | string;
    /** 컨테이너 상하 패딩(MUI spacing 단위). 기본값은 numpad 0, calculator 2. */
    py?: number | string;
    /**
     * calculator 전용 — 외부(예: 금액 입력칸)에서 타이핑 중인 텍스트를 표시부에 미러링한다.
     * 값이 바뀔 때마다 표시부를 그 텍스트로 덮어쓰고 진행 중이던 연산(누적값/연산자)은 초기화한다.
     */
    liveInput?: string;
}

/** 숫자 자리수를 입력값 뒤에 붙인다(클램프). */
function appendDigit(current: number, digit: number, min: number, max: number): number {
    const base = Math.max(0, Math.trunc(Number(current) || 0));
    const next = base * 10 + digit;
    return clampValue(next, min, max);
}

/** 마지막 자리수를 지운다(클램프). */
function removeLastDigit(current: number, min: number, max: number): number {
    const base = Math.max(0, Math.trunc(Number(current) || 0));
    const next = Math.trunc(base / 10);
    return clampValue(next, min, max);
}

/** 값을 min/max 범위로 제한한다. */
function clampValue(value: number, min: number, max: number): number {
    const truncated = Math.trunc(Number(value) || 0);
    const lowerBounded = Math.max(min, truncated);
    return Number.isFinite(max) ? Math.min(max, lowerBounded) : lowerBounded;
}

/** 소수부 최대 자리수(계산기 전용) — 그 이상은 더 입력해도 무시한다. */
const CALCULATOR_MAX_DECIMALS = 8;

/** 표시 텍스트(부호+콤마+소수점 허용)에서 정수부/소수부만 남긴 "부호+숫자+점" 원시 문자열을 뽑는다(콤마 제거). */
function toRawCalcText(text: string): string {
    const negative = text.trim().startsWith("-");
    const bare = text.replace(/[^\d.]/g, "");
    return negative ? "-" + bare : bare;
}

/** 표시 텍스트(부호+콤마+소수점 허용)에서 실제 숫자값을 뽑는다. 빈 값/"-"/"." 단독은 0. */
function parseSignedNumber(text: string): number {
    const negative = text.trim().startsWith("-");
    const bare = text.replace(/[^\d.]/g, "");
    if (bare === "" || bare === ".") return 0;
    const dotIndex = bare.indexOf(".");
    // 두 번째 이후의 "."은 그냥 숫자처럼 무시(제거)한다 — 있을 수 없는 입력이지만 방어적으로.
    const clean = dotIndex === -1 ? bare : bare.slice(0, dotIndex + 1) + bare.slice(dotIndex + 1).replace(/\./g, "");
    const n = Math.min(CALCULATOR_MAX, Number(clean) || 0);
    return negative ? -n : n;
}

/** 직접입력 중 천단위 콤마 포맷(부호+소수점 허용) — 정수부만 그룹핑하고 소수부는 입력한 그대로 보존한다. */
function formatSignedDigits(raw: string): string {
    const negative = raw.trim().startsWith("-");
    const bare = raw.replace(/[^\d.]/g, "");
    if (bare === "") return negative ? "-" : "";
    if (bare === ".") return (negative ? "-" : "") + ".";
    const dotIndex = bare.indexOf(".");
    const intRaw = dotIndex === -1 ? bare : bare.slice(0, dotIndex);
    const decRaw = dotIndex === -1 ? undefined : bare.slice(dotIndex + 1).replace(/\./g, "").slice(0, CALCULATOR_MAX_DECIMALS);
    const intGrouped = intRaw === "" ? "0" : Math.min(Number(intRaw), CALCULATOR_MAX).toLocaleString("en-US");
    const decimalSuffix = decRaw !== undefined ? "." + decRaw : "";
    return (negative ? "-" : "") + intGrouped + decimalSuffix;
}

/**
 * 계산기 전용 — 원시 텍스트(toRawCalcText 결과, 콤마 없이 부호+숫자+점)에 숫자 한 자리를 이어붙인다.
 * startFresh 면 그 자리부터 새로 시작. 정수부 상한(CALCULATOR_MAX)·소수부 자리수 상한을 넘기면 더 붙지 않는다.
 */
function appendCalcDigit(raw: string, digit: number, startFresh: boolean): string {
    if (startFresh) return String(digit);
    const negative = raw.startsWith("-");
    const bare = negative ? raw.slice(1) : raw;
    const dotIndex = bare.indexOf(".");
    if (dotIndex === -1) {
        const nextInt = bare === "0" || bare === "" ? String(digit) : bare + String(digit);
        if (Number(nextInt) > CALCULATOR_MAX) return raw; // 정수부 상한 — 더 안 붙는다.
        return (negative ? "-" : "") + nextInt;
    }
    const decimals = bare.slice(dotIndex + 1);
    if (decimals.length >= CALCULATOR_MAX_DECIMALS) return raw; // 소수부 자리수 상한.
    return raw + String(digit);
}

/** 계산기 전용 — 원시 텍스트에 소수점을 추가한다. 이미 있으면 무시, startFresh 면 "0." 부터 새로 시작. */
function appendCalcDecimalPoint(raw: string, startFresh: boolean): string {
    if (startFresh) return "0.";
    if (raw.includes(".")) return raw;
    return (raw === "" || raw === "-" ? raw + "0" : raw) + ".";
}

/** 계산기 전용 — 원시 텍스트에서 마지막 한 글자를 지운다(소수점·부호 포함). 다 지워지면 "0". */
function removeCalcLastChar(raw: string, startFresh: boolean): string {
    if (startFresh) return "0";
    const next = raw.slice(0, -1);
    return next === "" || next === "-" ? "0" : next;
}

/** 계산기 전용 — 원시 텍스트의 부호를 뒤집는다(0은 그대로 0). */
function toggleCalcSign(raw: string): string {
    if (raw === "0" || raw === "") return raw;
    return raw.startsWith("-") ? raw.slice(1) : "-" + raw;
}

/**
 * 숫자(0~9)·지우기(⌫)·전체삭제(C) 버튼으로 구성된 공용 숫자 키패드 — variant="numpad"(기본, 정수 전용)
 * | "calculator"(사칙연산·소수점·부호 반전 + 표시부 + 물리 키보드까지 갖춘 독립 계산기).
 */
export function NumberKeypad({
    variant = "numpad",
    digitOrder, // 미지정 시 numpad 는 "ascending", calculator 는 "descending" 이 기본(아래 각 분기에서 적용).
    value = 0,
    onChange,
    min = 0,
    max = Number.POSITIVE_INFINITY,
    sx,
    buttonHeight = 76,
    fontSize = "2rem",
    fillHeight = false,
    liveInput,
    px,
    py,
}: NumberKeypadProps) {
    if (variant === "calculator") {
        return (
            <CalculatorKeypad
                sx={sx}
                liveInput={liveInput}
                digitOrder={digitOrder ?? "descending"}
                buttonHeight={buttonHeight}
                fontSize={fontSize}
                px={px ?? 2}
                py={py ?? 2}
            />
        );
    }
    const order = digitOrder ?? "ascending";

    /** 키패드 버튼 공통 스타일. fillHeight 면 행 높이를 가득 채운다. */
    const buttonSx: SxProps<Theme> = {
        height: fillHeight ? "100%" : buttonHeight,
        minHeight: 0,
        minWidth: 0,
        fontSize,
        fontWeight: 700,
        borderRadius: 2,
        transition: "background-color 80ms ease, transform 80ms ease",
        // 누르는 순간 배경색이 살짝 들어오고 살짝 줄어드는 클릭 피드백.
        "&:active": {
            backgroundColor: "action.selected",
            transform: "scale(0.96)",
        },
    };

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                ...(fillHeight ? { gridTemplateRows: "repeat(4, 1fr)", height: "100%" } : {}),
                gap: 2,
                px: px ?? 0,
                py: py ?? 0,
                ...sx,
            }}
        >
            {DIGIT_ROWS[order].flat().map((digit) => (
                <Button
                    key={digit}
                    variant="outlined"
                    onClick={() => onChange?.(appendDigit(value, digit, min, max))}
                    sx={buttonSx}
                >
                    {digit}
                </Button>
            ))}
            {/* 마지막 줄: C(전체삭제) · 0 · ⌫(한 자리 지우기) */}
            <Button
                variant="outlined"
                color="inherit"
                onClick={() => onChange?.(clampValue(0, min, max))}
                sx={buttonSx}
            >
                C
            </Button>
            <Button variant="outlined" onClick={() => onChange?.(appendDigit(value, 0, min, max))} sx={buttonSx}>
                0
            </Button>
            <Button
                variant="outlined"
                color="inherit"
                onClick={() => onChange?.(removeLastDigit(value, min, max))}
                sx={buttonSx}
                aria-label="한 자리 지우기"
            >
                <BackspaceOutlinedIcon sx={{ fontSize: 36 }} />
            </Button>
        </Box>
    );
}

/**
 * calculator variant 본체 — 숫자 키패드(표준 계산기 순서: 7·8·9 위)에 사칙연산(+ − × ÷ =)을 더한 독립 계산기.
 * 값을 특정 화면에 되돌려주는 콜백 없이 그 자체로 완결된다. 표시부는 직접 클릭해 타이핑할 수 있고, 옆 아이콘으로
 * 값을 복사할 수 있다. 결과가 음수여도 그대로 표시하며, 새 연산자/등호를 누르면 다음 입력은 항상 새로 시작한다.
 */
function CalculatorKeypad({
    sx,
    liveInput,
    digitOrder = "descending",
    buttonHeight = 76,
    fontSize = "2rem",
    px = 2,
    py = 2,
}: {
    sx?: SxProps<Theme>;
    liveInput?: string;
    digitOrder?: "ascending" | "descending";
    buttonHeight?: number;
    fontSize?: number | string;
    px?: number | string;
    py?: number | string;
}) {
    const [displayText, setDisplayText] = useState("0"); // 현재 입력/결과값의 표시 텍스트(단일 소스).
    const [accumulator, setAccumulator] = useState<number | null>(null); // 진행 중인 누적값.
    const [pendingOp, setPendingOp] = useState<CalcOperator | null>(null); // 대기 중인 연산자.
    const [startFresh, setStartFresh] = useState(true); // true 면 다음 입력이 0부터 새로 시작.
    const [pressedKey, setPressedKey] = useState<string | null>(null); // 물리 키보드로 누른 키에 대응하는 버튼 식별자(눌림 효과용).
    const displayNumber = parseSignedNumber(displayText); // 계산에 쓰는 실제 숫자값.

    // 외부 미러 입력(liveInput) 이 바뀔 때마다 표시부를 그대로 따라간다. "11+55+66+" 처럼 연산자가 섞인 식이면
    // parseExpressionState 로 실제 타이핑한 것과 동일하게 누적값/대기 연산자로 접어서, 키패드로 직접 입력했을 때와
    // 동일하게(예: 상단에 "121 +") 보이도록 한다 — 그냥 원문을 그대로 박아두면 연산자가 텍스트로 계속 남아있게 된다.
    useEffect(() => {
        if (liveInput === undefined) return; // prop 미지정 시(독립형 사용) 동기화하지 않는다.
        if (liveInput === "" || !hasOperator(liveInput)) {
            // 연산자 없는 순수 숫자 입력 — 기존과 동일하게 원문 그대로 미러링.
            setDisplayText(liveInput === "" ? "0" : liveInput);
            setAccumulator(null);
            setPendingOp(null);
            setStartFresh(false); // 직접 타이핑한 것과 동일하게 취급 — 이어서 키패드를 누르면 뒤에 자리수가 붙는다.
            return;
        }
        const { accumulator: acc, pendingOp: op, currentText } = parseExpressionState(liveInput);
        setDisplayText(currentText === "" ? formatNumber(acc ?? 0) : formatSignedDigits(currentText));
        setAccumulator(acc);
        setPendingOp(op);
        setStartFresh(currentText === ""); // 연산자로 막 끊긴 직후면 다음 입력이 새로 시작(true), 피연산자 타이핑 중이면 false.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveInput]);

    // 상단 보조 표시줄 — "12,345 +" 처럼 누적값과 대기 연산자를 보여준다.
    const expressionText = accumulator !== null && pendingOp ? `${formatNumber(accumulator)} ${pendingOp}` : " ";

    /** 숫자 키패드 자릿수 입력. */
    const handleCalcDigit = (digit: number) => {
        setDisplayText(formatSignedDigits(appendCalcDigit(toRawCalcText(displayText), digit, startFresh)));
        setStartFresh(false);
    };

    /** 소수점(.) 입력 — 이미 있으면 무시. */
    const handleCalcDecimalPoint = () => {
        setDisplayText(formatSignedDigits(appendCalcDecimalPoint(toRawCalcText(displayText), startFresh)));
        setStartFresh(false);
    };

    /** 한 자리 지우기(⌫). */
    const handleCalcBackspace = () => {
        setDisplayText(formatSignedDigits(removeCalcLastChar(toRawCalcText(displayText), startFresh)));
        setStartFresh(false);
    };

    /** 부호 반전(+/−) — 현재 표시값의 음수/양수를 뒤집는다. */
    const handleCalcToggleSign = () => {
        setDisplayText(formatSignedDigits(toggleCalcSign(toRawCalcText(displayText))));
        setStartFresh(false);
    };

    /** 표시부 직접 입력(타이핑) — 부호+콤마 포맷을 유지하며 그대로 반영한다. */
    const handleDisplayInputChange = (raw: string) => {
        setDisplayText(formatSignedDigits(raw));
        setStartFresh(false);
    };

    /** 표시부 blur 시 빈 값/부호만 남은 상태는 0으로, 소수점만 매달린 상태("12.")는 소수점을 떼고 정리한다. */
    const handleDisplayInputBlur = () => {
        const trimmed = displayText.trim();
        if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
            setDisplayText("0");
        } else if (trimmed.endsWith(".")) {
            setDisplayText(trimmed.slice(0, -1));
        }
    };

    /** 현재값을 클립보드에 복사한다(원시 숫자, 콤마 없이). */
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(String(displayNumber));
            SuccessAlert({ message: "복사되었습니다.", delay: 500 });
        } catch {
            // 클립보드 접근 불가 시 조용히 무시한다.
        }
    };

    /** 연산자(+ − × ÷) 클릭 — 대기 중인 연산이 있으면 먼저 계산(체인)한 뒤 새 연산자를 건다. */
    const handleOperator = (op: CalcOperator) => {
        if (accumulator !== null && pendingOp && !startFresh) {
            const result = computeOperator(accumulator, pendingOp, displayNumber);
            if (result === null) {
                ErrorAlert({ message: "0으로 나눌 수 없습니다." });
                return;
            }
            setAccumulator(result);
            setDisplayText(formatNumber(result)); // 윈도우 계산기처럼 다음 연산자를 누르는 즉시 누적 결과를 메인 표시부에 반영.
        } else {
            setAccumulator(displayNumber);
        }
        setPendingOp(op);
        setStartFresh(true);
    };

    /** 등호(=) 클릭 — 대기 중인 연산을 확정하고 결과를 표시, 계산 상태를 초기화한다. */
    const handleEquals = () => {
        if (accumulator === null || !pendingOp) return;
        const result = computeOperator(accumulator, pendingOp, displayNumber);
        if (result === null) {
            ErrorAlert({ message: "0으로 나눌 수 없습니다." });
            return;
        }
        setDisplayText(formatNumber(result));
        setAccumulator(null);
        setPendingOp(null);
        setStartFresh(true);
    };

    /** 전체 초기화(AC) — 표시값/누적값/연산자를 모두 비운다. */
    const handleAllClear = () => {
        setDisplayText("0");
        setAccumulator(null);
        setPendingOp(null);
        setStartFresh(true);
    };

    /**
     * 물리 키보드 연결 — 이 컴포넌트 안(입력칸·버튼)에 포커스가 있을 때만 동작한다(다른 화면 입력칸과 충돌 없음).
     * 연산자(+ − × ÷)·Enter(=)·Escape(AC)는 입력칸 포커스 여부와 무관하게 항상 계산기 동작으로 가로챈다.
     * 숫자/소수점/백스페이스는 입력칸에 포커스가 있으면 기본적으로 네이티브 타이핑(직접 편집)에 맡기되, startFresh(연산자
     * 직후라 다음 입력이 새로 시작해야 하는 상태)일 때만 키패드를 누른 것처럼 state 기반 로직(appendCalcDigit 등)으로
     * 가로채 처리한다 — 선택(select) 같은 네이티브 트릭 없이 "123+123" 이 "123123" 으로 이어붙는 것을 막기 위함이다.
     * 각 분기에서 setPressedKey 로 대응하는 화면 버튼을 눌린 상태로 표시한다 — 마우스 클릭의 :active 효과와
     * 동일한 시각 피드백을 물리 키보드 입력에도 주기 위함이다(keyup 에서 handleKeyUp 이 해제한다).
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const isDisplayInput = (event.target as HTMLElement).tagName === "INPUT";

        if (event.key >= "0" && event.key <= "9") {
            setPressedKey(event.key); // 네이티브 타이핑으로 넘기는 경우(아래 return)에도 눌림 효과는 항상 켠다.
            if (isDisplayInput && !startFresh) return;
            event.preventDefault();
            handleCalcDigit(Number(event.key));
            return;
        }
        if (event.key === ".") {
            setPressedKey(".");
            if (isDisplayInput && !startFresh) return;
            event.preventDefault();
            handleCalcDecimalPoint();
            return;
        }
        if (event.key === "Backspace") {
            setPressedKey("backspace");
            if (isDisplayInput && !startFresh) return;
            event.preventDefault();
            handleCalcBackspace();
            return;
        }
        const op = OPERATOR_KEY_MAP[event.key];
        if (op) {
            // 입력칸에서 "-" 는 계산이 전혀 시작되지 않은 맨 처음(대기 연산자도 없는 상태)에만 음수 부호로 우선한다
            // (예: AC 직후 "-5" 직접 입력). startFresh 만 보면 연산자를 누른 직후에도 true 라서, 그 상태에서 "-"를
            // 또 누르면 네이티브 타이핑으로 새다가 startFresh 가 조용히 꺼져 다음 연산자에서 잘못된 체인 계산(예: 5-5=0)
            // 으로 이어졌었다 — 그래서 대기 중인 연산이 없을 때로 좁혔다. 그 외엔 다른 연산자와 동일하게 뺄셈으로 가로챈다.
            if (isDisplayInput && event.key === "-" && startFresh && accumulator === null && pendingOp === null) return;
            event.preventDefault();
            setPressedKey(op);
            handleOperator(op);
            return;
        }
        if (event.key === "Enter" || event.key === "=") {
            event.preventDefault();
            setPressedKey("=");
            handleEquals();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            setPressedKey("C");
            handleAllClear();
        }
    };

    /** keydown 에서 켠 눌림 효과를 실제 키를 뗄 때 끈다. */
    const handleKeyUp = () => setPressedKey(null);

    /** 눌린 키에 대응하는 버튼이면 클릭(:active)과 같은 스타일을 강제 적용한다. */
    const pressedSx = (key: string): SxProps<Theme> =>
        pressedKey === key ? { backgroundColor: "action.selected", transform: "scale(0.96)" } : {};

    /** 계산기 버튼 공통 스타일(키패드 숫자 버튼과 통일) — buttonHeight/fontSize prop 으로 크기 조정. */
    const digitButtonSx: SxProps<Theme> = {
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        fontSize,
        fontWeight: 700,
        borderRadius: 2,
        transition: "background-color 80ms ease, transform 80ms ease",
        "&:active": { backgroundColor: "action.selected", transform: "scale(0.96)" },
    };
    /** 연산자 버튼 스타일 — 숫자 버튼과 같은 그리드 칸을 쓰므로 너비는 동일, 기호만 fontSize 의 0.75배로 살짝 작게. */
    const operatorButtonSx: SxProps<Theme> = {
        ...digitButtonSx,
        fontSize: typeof fontSize === "number" ? fontSize * 0.75 : `calc(${fontSize} * 0.75)`,
    };
    /** 연산자 4개 — 숫자 키패드 각 행(7·8·9 / 4·5·6 / 1·2·3 / +/-·0·.)과 같은 줄에 하나씩 나란히 놓인다. */
    const OPERATORS: CalcOperator[] = ["÷", "×", "−", "+"];

    return (
        <Box
            sx={{ display: "flex", flexDirection: "column", px, py, gap: 1.5, ...sx }}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBlur={handleKeyUp}
        >
            {/* 표시부 — 누적식(상단, 작게) + 현재값(직접 입력 가능, 하단, 크게) + C(전체삭제)·⌫(한 자리 지우기)·복사 아이콘.
                윈도우 계산기처럼 C/⌫ 를 숫자 키패드 밖(표시부 쪽)에 둔다. */}
            <Box sx={{ px: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: 14, color: "text.secondary", minHeight: 20, textAlign: "right" }}>
                        {expressionText}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip title="전체 삭제" disableInteractive>
                            <IconButton
                                size="small"
                                onClick={handleAllClear}
                                sx={pressedSx("C")}
                                aria-label="전체 삭제"
                            >
                                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>C</Typography>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="한 자리 지우기" disableInteractive>
                            <IconButton
                                size="small"
                                onClick={handleCalcBackspace}
                                sx={pressedSx("backspace")}
                                aria-label="한 자리 지우기"
                            >
                                <BackspaceOutlinedIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box
                        component="input"
                        value={displayText}
                        onChange={(e) => handleDisplayInputChange(e.target.value)}
                        onBlur={handleDisplayInputBlur}
                        onFocus={(e) => e.target.select()}
                        spellCheck={false}
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            textAlign: "right",
                            fontSize: 40,
                            fontWeight: 700,
                            fontFamily: "inherit",
                            color: "inherit",
                            p: 0,
                        }}
                    />
                    <Tooltip title="복사" disableInteractive>
                        <IconButton size="small" onClick={() => void handleCopy()} aria-label="현재값 복사">
                            <ContentCopyIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* 키패드(숫자·+/-·.,  7·8·9 가 위 — 표준 계산기 순서) + 연산자(÷ × − +) 를 한 그리드에 배치해 버튼 너비를 통일한다.
                각 행 높이는 buttonHeight prop 으로 조정한다. */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gridTemplateRows: `repeat(4, ${buttonHeight}px)`,
                    gap: 1.5,
                }}
            >
                {DIGIT_ROWS[digitOrder].map((row, rowIndex) => (
                    <Fragment key={rowIndex}>
                        {row.map((digit) => (
                            <Button
                                key={digit}
                                variant="outlined"
                                onClick={() => handleCalcDigit(digit)}
                                sx={{ ...digitButtonSx, ...pressedSx(String(digit)) }}
                            >
                                {digit}
                            </Button>
                        ))}
                        <Button
                            variant="outlined"
                            color={pendingOp === OPERATORS[rowIndex] ? "primary" : "inherit"}
                            onClick={() => handleOperator(OPERATORS[rowIndex])}
                            sx={{ ...operatorButtonSx, ...pressedSx(OPERATORS[rowIndex]) }}
                        >
                            {OPERATORS[rowIndex]}
                        </Button>
                    </Fragment>
                ))}
                {/* 마지막 줄: +/-(부호 반전) · 0 · .(소수점) · + — 윈도우 계산기와 동일한 배치. */}
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={handleCalcToggleSign}
                    sx={{ ...digitButtonSx, ...pressedSx("+/-") }}
                    aria-label="부호 반전"
                >
                    ±
                </Button>
                <Button variant="outlined" onClick={() => handleCalcDigit(0)} sx={{ ...digitButtonSx, ...pressedSx("0") }}>
                    0
                </Button>
                <Button
                    variant="outlined"
                    onClick={handleCalcDecimalPoint}
                    sx={{ ...digitButtonSx, ...pressedSx(".") }}
                    aria-label="소수점"
                >
                    .
                </Button>
                <Button
                    variant="outlined"
                    color={pendingOp === OPERATORS[3] ? "primary" : "inherit"}
                    onClick={() => handleOperator(OPERATORS[3])}
                    sx={{ ...operatorButtonSx, ...pressedSx(OPERATORS[3]) }}
                >
                    {OPERATORS[3]}
                </Button>
            </Box>

            {/* 하단 — 등호(=, 강조). AC 는 키패드 첫 줄로 이동했으므로 여기 별도 버튼은 두지 않는다. buttonHeight 와 같은 높이로 맞춘다. */}
            <Button
                variant="contained"
                onClick={handleEquals}
                sx={{ height: buttonHeight, fontSize: "1.25rem", fontWeight: 700, borderRadius: 2, ...pressedSx("=") }}
            >
                =
            </Button>
        </Box>
    );
}
