/**
 * 사칙연산 계산 공용 유틸.
 * Calculator(공용 계산기)와 금액 입력란이 같은 엔진을 공유해, 입력란에 식을 직접 타이핑해도
 * 계산기와 동일한 결과를 내도록 한다. 우선순위 없이 왼쪽부터 순서대로 계산한다(계산기와 동일 정책).
 */

/** 사칙연산 기호(계산기 버튼 표기 기준). */
export type CalcOperator = "+" | "−" | "×" | "÷";

/** 두 피연산자를 연산자로 계산한다(정수 반올림, 0으로 나누면 null). */
export function computeOperator(a: number, op: CalcOperator, b: number): number | null {
    switch (op) {
        case "+":
            return a + b;
        case "−":
            return a - b;
        case "×":
            return a * b;
        case "÷":
            return b === 0 ? null : Math.round(a / b);
    }
}

/** 물리 키보드/자유 타이핑 문자를 계산기 표기 연산자로 정규화한다(*, x, X → ×, / → ÷). */
function normalizeOperatorChars(text: string): string {
    return text.replace(/[xX*]/g, "×").replace(/\//g, "÷");
}

/**
 * "12000+3400-500×2" 같은 식 문자열을 왼쪽부터 순서대로 계산한다(연산자 우선순위 없음).
 * 콤마(천단위)는 무시하고, 선행 "-"만 첫 숫자의 부호로 인정한다(그 외 "-"는 뺄셈 연산자).
 * 연산자가 하나도 없으면 단일 숫자로 파싱(기존 "그냥 금액 입력" 과 동일 동작).
 * 형식이 잘못되었거나 0으로 나누면 null(호출측이 오류 처리).
 */
export function evaluateExpression(raw: string): number | null {
    const text = normalizeOperatorChars(raw.replace(/,/g, "").trim());
    if (!text) return null;
    // 맨 앞의 "-"만 부호로 남기고, 그 외 "-"는 연산자로 분리 토큰화한다.
    const tokens = text.split(/([+×÷]|(?<!^)-)/).filter((t) => t !== "");
    if (tokens.length === 0) return null;

    let result = Number(tokens[0]);
    if (!Number.isFinite(result)) return null;

    for (let i = 1; i < tokens.length; i += 2) {
        const op = tokens[i] as CalcOperator;
        const next = Number(tokens[i + 1]);
        if (!Number.isFinite(next)) return null;
        const computed = computeOperator(result, op, next);
        if (computed === null) return null;
        result = computed;
    }
    return result;
}

/** 문자열에 사칙연산 기호(+, -, ×, ÷, *, x, /)가 있는지 — 있으면 "식"으로 보고 평가 대상이다. */
export function hasOperator(text: string): boolean {
    // 맨 앞의 "-"(음수 부호)만 있는 경우는 연산자로 보지 않는다.
    const body = text.trim().replace(/^-/, "");
    return /[+\-×÷*xX/]/.test(body);
}

/** 문자열에서 주어진 연산자 문자 집합이 2개 이상 연달아 오면 마지막 것만 남긴다(계속 눌러도 마지막 선택만 유효한 계산기 관례). */
function collapseRuns(text: string, charClass: string): string {
    return text.replace(new RegExp(`[${charClass}]{2,}`, "g"), (run) => run.slice(-1));
}

/** 정규화된 연산자(+ − × ÷)만 대상으로 연달아 온 것을 마지막 것만 남긴다 — 계산 엔진 내부(parseExpressionState)용. */
function collapseOperatorRuns(text: string): string {
    return collapseRuns(text, "+\\-×÷");
}

/**
 * 맨 앞의 "-"(음수 부호)는 남기고, 그 외 연산자(+×÷*xX/)가 맨 앞에 오면 의미가 없으므로 제거한다.
 * "5 빼기 3"처럼 뺄셈은 항상 두 번째 숫자 앞에 오지만, 덧셈/곱셈/나눗셈은 첫 숫자보다 앞에 올 수 없다.
 */
function stripLeadingNonMinusOperator(text: string): string {
    return text.replace(/^[+×÷*xX/]+/, "");
}

/**
 * 식을 타이핑하는 중(계산 확정 전) 허용 문자만 남기고(숫자·콤마·부호·연산자), 연산자를 연달아 눌러도
 * 마지막 것만 남도록 정리하며(예: "11++++123+++++" → "11+123+"), 맨 앞에 "-" 외의 연산자가 오는 것도
 * 막는다(예: "+123" → "123"). 연산자를 완전히 지우지 않고 그대로 보여줄 때 쓴다 — 외부 입력칸(예: 금액
 * 입력란)의 onChange 에 바로 적용하면 된다.
 */
export function formatExpressionInput(text: string): string {
    const collapsed = collapseRuns(text.replace(/[^\d,+\-×÷*xX/]/g, ""), "+\\-×÷*xX/");
    return stripLeadingNonMinusOperator(collapsed);
}

/** {@link parseExpressionState} 의 반환값 — 계산기 표시 상태(누적값·대기 연산자·타이핑 중인 피연산자). */
export interface ExpressionState {
    /** 마지막으로 완결된 연산까지의 누적값. 연산자가 하나도 확정되지 않았으면 null. */
    accumulator: number | null;
    /** 다음에 적용될 연산자(마지막에 눌린/타이핑된 것). 없으면 null. */
    pendingOp: CalcOperator | null;
    /** 아직 연산자로 끊기지 않은, 현재 입력 중인 마지막 피연산자의 원본 텍스트. */
    currentText: string;
}

/**
 * "11+55+66+" 같은 식 문자열을 계산기 표시 상태로 분해한다 — 왼쪽부터 순서대로(우선순위 없이) 계산해
 * 완결된 부분은 accumulator/pendingOp 로 접고, 아직 연산자로 끊기지 않은 마지막 피연산자는 currentText 로 남긴다.
 * 연산자가 연달아 입력된 경우(collapseOperatorRuns) 마지막 것만 유효하게 처리한다.
 * NumberKeypad 의 calculator variant 가 liveInput 을 실제로 타이핑한 것과 동일하게 미러링하는 데 쓴다.
 */
export function parseExpressionState(raw: string): ExpressionState {
    const collapsed = stripLeadingNonMinusOperator(
        collapseOperatorRuns(normalizeOperatorChars(raw.replace(/,/g, "").trim()))
    );
    if (!collapsed) return { accumulator: null, pendingOp: null, currentText: "" };
    // "-" 하나만 덜렁 있으면 음수 부호로 타이핑 시작한 상태로 본다(그 외 연산자는 stripLeadingNonMinusOperator 가 이미 제거).
    if (collapsed === "-") return { accumulator: null, pendingOp: null, currentText: "-" };

    const tokens = collapsed.split(/([+×÷]|(?<!^)-)/).filter((t) => t !== "");
    if (tokens.length === 0) return { accumulator: null, pendingOp: null, currentText: "" };
    if (tokens.length === 1) return { accumulator: null, pendingOp: null, currentText: tokens[0] };

    // 토큰 개수가 짝수면 맨 끝이 연산자(다음 피연산자 타이핑 전) — 그 전까지 전부 계산해 누적한다.
    const endsWithOperator = tokens.length % 2 === 0;
    const currentText = endsWithOperator ? "" : tokens[tokens.length - 1];
    const danglingTokens = endsWithOperator ? tokens : tokens.slice(0, -1);

    let acc = Number(danglingTokens[0]);
    if (!Number.isFinite(acc)) return { accumulator: null, pendingOp: null, currentText: collapsed };
    let pendingOp: CalcOperator | null = null;
    for (let i = 1; i < danglingTokens.length; i += 2) {
        const op = danglingTokens[i] as CalcOperator;
        const nextToken = danglingTokens[i + 1];
        if (nextToken === undefined) {
            pendingOp = op; // 마지막 연산자 — 다음 피연산자 대기 중.
            break;
        }
        const next = Number(nextToken);
        if (!Number.isFinite(next)) return { accumulator: acc, pendingOp: op, currentText };
        const computed = computeOperator(acc, op, next);
        if (computed === null) return { accumulator: acc, pendingOp: op, currentText }; // 0으로 나눔 — 그 지점까지만 반영.
        acc = computed;
        pendingOp = null;
    }
    return { accumulator: acc, pendingOp, currentText };
}
