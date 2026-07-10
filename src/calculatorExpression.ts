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

/** 식을 타이핑하는 중(계산 확정 전) 허용 문자만 남긴다(숫자·콤마·부호·연산자). 연산자를 지우지 않고 그대로 보여줄 때 쓴다. */
export function formatExpressionInput(text: string): string {
    return text.replace(/[^\d,+\-×÷*xX/]/g, "");
}
