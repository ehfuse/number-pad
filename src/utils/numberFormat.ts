/** 숫자를 천단위 콤마 구분 문자열로 포맷한다(음수 부호 보존, 소수부는 최대 8자리까지 있는 그대로 유지). */
export function formatNumber(value: number): string {
    const num = Number(value) || 0;
    const negative = num < 0;
    const formatted = Math.abs(num).toLocaleString("en-US", { maximumFractionDigits: 8 });
    return negative ? `-${formatted}` : formatted;
}
