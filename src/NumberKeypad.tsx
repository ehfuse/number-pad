import { useEffect, useState } from "react";
import { Box, Button, IconButton, Tooltip, Typography, type SxProps, type Theme } from "@mui/material";
import BackspaceOutlinedIcon from "@mui/icons-material/BackspaceOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ErrorAlert, SuccessAlert } from "@ehfuse/alerts";
import { formatNumber } from "./utils/numberFormat";
import { computeOperator, type CalcOperator } from "./calculatorExpression";

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
    /** 버튼 높이(px, 기본 76, numpad 전용). fillHeight 가 true 면 무시된다. */
    buttonHeight?: number;
    /** 숫자 폰트 크기(기본 "2rem", numpad 전용). */
    fontSize?: number | string;
    /** true 면 키패드가 부모 높이를 가득 채우도록 4행을 균등 분배한다(numpad 전용). */
    fillHeight?: boolean;
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

/** 표시 텍스트(부호+콤마 허용)에서 실제 숫자값을 뽑는다. 빈 값/"-" 단독은 0. */
function parseSignedNumber(text: string): number {
    const negative = text.trim().startsWith("-");
    const digits = text.replace(/[^\d]/g, "");
    if (digits === "") return 0;
    const n = Math.min(CALCULATOR_MAX, Number(digits));
    return negative ? -n : n;
}

/** 직접입력 중 천단위 콤마 포맷(부호 허용) — 선행 "-"를 보존하고 숫자만 그룹핑한다. */
function formatSignedDigits(raw: string): string {
    const negative = raw.trim().startsWith("-");
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") return negative ? "-" : "";
    const n = Math.min(CALCULATOR_MAX, Number(digits));
    return (negative ? "-" : "") + formatNumber(n);
}

/**
 * 숫자(0~9)·지우기(⌫)·전체삭제(C) 버튼으로 구성된 공용 숫자 키패드 — variant="numpad"(기본)
 * | "calculator"(사칙연산 + 표시부 + 물리 키보드까지 갖춘 독립 계산기).
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
}: NumberKeypadProps) {
    if (variant === "calculator") {
        return <CalculatorKeypad sx={sx} liveInput={liveInput} digitOrder={digitOrder ?? "descending"} />;
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
}: {
    sx?: SxProps<Theme>;
    liveInput?: string;
    digitOrder?: "ascending" | "descending";
}) {
    const [displayText, setDisplayText] = useState("0"); // 현재 입력/결과값의 표시 텍스트(단일 소스).
    const [accumulator, setAccumulator] = useState<number | null>(null); // 진행 중인 누적값.
    const [pendingOp, setPendingOp] = useState<CalcOperator | null>(null); // 대기 중인 연산자.
    const [startFresh, setStartFresh] = useState(true); // true 면 다음 입력이 0부터 새로 시작.
    const displayNumber = parseSignedNumber(displayText); // 계산에 쓰는 실제 숫자값.

    // 외부 미러 입력(liveInput) 이 바뀔 때마다 표시부를 그대로 따라가고, 진행 중이던 계산은 초기화한다.
    useEffect(() => {
        if (liveInput === undefined) return; // prop 미지정 시(독립형 사용) 동기화하지 않는다.
        setDisplayText(liveInput === "" ? "0" : liveInput);
        setAccumulator(null);
        setPendingOp(null);
        setStartFresh(false); // 직접 타이핑한 것과 동일하게 취급 — 이어서 키패드를 누르면 뒤에 자리수가 붙는다.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveInput]);

    // 상단 보조 표시줄 — "12,345 +" 처럼 누적값과 대기 연산자를 보여준다.
    const expressionText = accumulator !== null && pendingOp ? `${formatNumber(accumulator)} ${pendingOp}` : " ";

    /** 숫자 키패드 입력(디지트/C/⌫) — 항상 새 입력 모드를 해제한다. */
    const handleKeypadChange = (next: number) => {
        setDisplayText(formatNumber(next));
        setStartFresh(false);
    };

    /** 표시부 직접 입력(타이핑) — 부호+콤마 포맷을 유지하며 그대로 반영한다. */
    const handleDisplayInputChange = (raw: string) => {
        setDisplayText(formatSignedDigits(raw));
        setStartFresh(false);
    };

    /** 표시부 blur 시 빈 값/부호만 남은 상태를 0으로 정리한다. */
    const handleDisplayInputBlur = () => {
        if (displayText.trim() === "" || displayText.trim() === "-") setDisplayText("0");
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
     * 숫자/백스페이스는 입력칸에 포커스가 있으면 기본적으로 네이티브 타이핑(직접 편집)에 맡기되, startFresh(연산자
     * 직후라 다음 입력이 새로 시작해야 하는 상태)일 때만 키패드를 누른 것처럼 state 기반 로직(appendDigit/removeLastDigit)으로
     * 가로채 처리한다 — 선택(select) 같은 네이티브 트릭 없이 "123+123" 이 "123123" 으로 이어붙는 것을 막기 위함이다.
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const isDisplayInput = (event.target as HTMLElement).tagName === "INPUT";

        if (event.key >= "0" && event.key <= "9") {
            if (isDisplayInput && !startFresh) return;
            event.preventDefault();
            const digit = Number(event.key);
            handleKeypadChange(appendDigit(startFresh ? 0 : displayNumber, digit, 0, CALCULATOR_MAX));
            return;
        }
        if (event.key === "Backspace") {
            if (isDisplayInput && !startFresh) return;
            event.preventDefault();
            handleKeypadChange(removeLastDigit(startFresh ? 0 : displayNumber, 0, CALCULATOR_MAX));
            return;
        }
        const op = OPERATOR_KEY_MAP[event.key];
        if (op) {
            // 입력칸에서 "-" 는 음수 직접입력(선행 부호)으로 우선 — 그 외 연산자 키는 입력칸 여부와 무관하게 항상 가로챈다.
            if (isDisplayInput && event.key === "-") return;
            event.preventDefault();
            handleOperator(op);
            return;
        }
        if (event.key === "Enter" || event.key === "=") {
            event.preventDefault();
            handleEquals();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            handleAllClear();
        }
    };

    /** 계산기 버튼 공통 스타일(키패드 숫자 버튼과 통일). */
    const digitButtonSx: SxProps<Theme> = {
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        fontSize: "2rem",
        fontWeight: 700,
        borderRadius: 2,
        transition: "background-color 80ms ease, transform 80ms ease",
        "&:active": { backgroundColor: "action.selected", transform: "scale(0.96)" },
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", p: 2, gap: 1.5, ...sx }} onKeyDown={handleKeyDown}>
            {/* 표시부 — 누적식(상단, 작게) + 현재값(직접 입력 가능, 하단, 크게) + 복사 아이콘. */}
            <Box sx={{ px: 1 }}>
                <Typography sx={{ fontSize: 14, color: "text.secondary", minHeight: 20, textAlign: "right" }}>
                    {expressionText}
                </Typography>
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

            {/* 키패드(숫자·C·⌫, 7·8·9 가 위 — 표준 계산기 순서) + 연산자 열(÷ × − +). 자체 콘텐츠 크기로만 렌더. */}
            <Box sx={{ display: "flex", gap: 1.5 }}>
                <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(4, 1fr)", gap: 1.5 }}>
                    {DIGIT_ROWS[digitOrder].flat().map((digit) => (
                        <Button
                            key={digit}
                            variant="outlined"
                            onClick={() => handleKeypadChange(appendDigit(startFresh ? 0 : displayNumber, digit, 0, CALCULATOR_MAX))}
                            sx={digitButtonSx}
                        >
                            {digit}
                        </Button>
                    ))}
                    {/* 마지막 줄: C(전체삭제) · 0 · ⌫(한 자리 지우기) */}
                    <Button variant="outlined" color="inherit" onClick={handleAllClear} sx={digitButtonSx}>
                        C
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => handleKeypadChange(appendDigit(startFresh ? 0 : displayNumber, 0, 0, CALCULATOR_MAX))}
                        sx={digitButtonSx}
                    >
                        0
                    </Button>
                    <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => handleKeypadChange(removeLastDigit(startFresh ? 0 : displayNumber, 0, CALCULATOR_MAX))}
                        sx={digitButtonSx}
                        aria-label="한 자리 지우기"
                    >
                        <BackspaceOutlinedIcon sx={{ fontSize: 32 }} />
                    </Button>
                </Box>
                <Box sx={{ display: "grid", gridTemplateRows: "repeat(4, 1fr)", gap: 1.5, width: 76 }}>
                    {(["÷", "×", "−", "+"] as CalcOperator[]).map((op) => (
                        <Button
                            key={op}
                            variant="outlined"
                            color={pendingOp === op ? "primary" : "inherit"}
                            onClick={() => handleOperator(op)}
                            sx={{ minWidth: 0, height: "100%", fontSize: "1.5rem", fontWeight: 700, borderRadius: 2 }}
                        >
                            {op}
                        </Button>
                    ))}
                </Box>
            </Box>

            {/* 하단 — 등호(=, 강조). AC 는 키패드 첫 줄로 이동했으므로 여기 별도 버튼은 두지 않는다. */}
            <Button
                variant="contained"
                onClick={handleEquals}
                sx={{ height: 56, fontSize: "1.25rem", fontWeight: 700, borderRadius: 2 }}
            >
                =
            </Button>
        </Box>
    );
}
