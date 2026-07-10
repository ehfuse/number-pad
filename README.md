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

### calculator (사칙연산 포함 독립 계산기)

```tsx
import { NumberKeypad } from "@ehfuse/number-pad";

<NumberKeypad variant="calculator" liveInput={mirroredText} />;
```

## Exports

-   `NumberKeypad`, `NumberKeypadProps`
-   `computeOperator`, `evaluateExpression`, `hasOperator`, `formatExpressionInput`, `CalcOperator`

## Peer Dependencies

-   `react` ^18 || ^19
-   `react-dom` ^18 || ^19
-   `@mui/material` >=5
-   `@mui/icons-material` >=5
-   `@emotion/react` >=11
-   `@emotion/styled` >=11
-   `@ehfuse/alerts` >=1
