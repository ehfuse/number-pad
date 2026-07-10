/** 정수를 천단위 콤마 구분 문자열로 포맷한다(음수 부호 보존). */
export function formatNumber(value: number): string {
    const num = Math.trunc(Number(value) || 0);
    const negative = num < 0;
    const formatted = Math.abs(num).toLocaleString("en-US");
    return negative ? `-${formatted}` : formatted;
}
