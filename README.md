# @ehfuse/number-pad

React 숫자 키패드 + 사칙연산 계산기 컴포넌트 (MUI 기반)

## Install

```bash
npm install @ehfuse/number-pad
```

## Usage

### numpad (기본, controlled 숫자 입력)

```tsx
import { NumberKeypad } from "@ehfuse/number-pad";

<NumberKeypad value={qty} onChange={setQty} min={0} max={999} />;
```

### pin (문자열 PIN — 간편비밀번호)

앞자리 0 을 보존하는 고정 자리수 문자열 입력. 자리수 표시(●○ 도트 등)는 소비 측에서 `pin` 값으로 그린다.

```tsx
import { NumberKeypad } from "@ehfuse/number-pad";

const [pin, setPin] = useState("");

<NumberKeypad variant="pin" pin={pin} onPinChange={setPin} pinMaxLength={6} />;
```

`shuffle` 을 주면 숫자 버튼 위치를 마운트 시 무작위로 섞는다(보안 키패드). numpad/pin 두 variant 에 적용된다.

```tsx
<NumberKeypad variant="pin" pin={pin} onPinChange={setPin} shuffle />;
```

### calculator (사칙연산 포함 독립 계산기)

```tsx
import { NumberKeypad } from "@ehfuse/number-pad";

<NumberKeypad variant="calculator" liveInput={mirroredText} />;
```

소수점(`.`)을 지원한다(소수부 최대 8자리). 버튼은 물리 키보드 넘패드와 비슷하게 배치되며(`+`·`=`는 오른쪽에
세로로 길게, `C`·`⌫`·`.`은 키패드 안에), 물리 키보드에서도 숫자·`.`·Backspace·연산자·Enter(=)·Escape(전체삭제)가
모두 동작한다. 음수는 값 맨 앞에 `-`를 입력해 만든다.

### liveInput — 외부 입력칸과 연동

`liveInput`은 외부(예: 금액 입력칸)에서 타이핑 중인 텍스트를 계산기 표시부에 그대로 미러링한다. `"11+55+66+"`처럼
연산자가 섞인 식을 넘기면 실제로 그 순서대로 타이핑한 것처럼 누적값/대기 연산자로 계산해 보여준다(연산자를
연달아 입력해도 마지막 것만 유효). 미러링은 외부 → 계산기 단방향이라, 그 입력칸 자체를 정리하거나 Enter로
확정 계산하는 건 소비 측(그 입력칸) 책임이다 — `formatExpressionInput`으로 타이핑 중 필터링하고,
`evaluateExpression`으로 확정 시점(Enter/blur)에 계산한다.

```tsx
import { NumberKeypad, formatExpressionInput, evaluateExpression } from "@ehfuse/number-pad";

<TextField
    value={amountText}
    onChange={(e) => setAmountText(formatExpressionInput(e.target.value))}
    onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        const result = evaluateExpression(amountText);
        if (result !== null) setAmountText(String(result));
    }}
/>
<NumberKeypad variant="calculator" liveInput={amountText} />;
```

### 크기 조정

`buttonHeight`(px)·`fontSize`는 두 variant 모두에 적용된다. `px`/`py`는 컨테이너 좌우/상하 패딩(MUI spacing 단위 — 기본값은 numpad 0, calculator 2).

```tsx
<NumberKeypad value={qty} onChange={setQty} buttonHeight={60} fontSize={24} px={1} py={1} />;
<NumberKeypad variant="calculator" buttonHeight={64} fontSize={28} />;
```

## Exports

-   `NumberKeypad`, `NumberKeypadProps`
-   `computeOperator`, `evaluateExpression`, `hasOperator`, `formatExpressionInput`, `parseExpressionState`, `CalcOperator`, `ExpressionState`

## Peer Dependencies

-   `react` ^18 || ^19
-   `react-dom` ^18 || ^19
-   `@mui/material` >=5
-   `@mui/icons-material` >=5
-   `@emotion/react` >=11
-   `@emotion/styled` >=11
-   `@ehfuse/alerts` >=1
