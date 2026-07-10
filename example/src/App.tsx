import { useState } from "react";
import {
    Box,
    Container,
    Paper,
    Tab,
    Tabs,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
} from "@mui/material";
import { NumberKeypad, formatExpressionInput, evaluateExpression } from "@/index";

function NumpadDemo() {
    const [value, setValue] = useState(0);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(999);
    const [digitOrder, setDigitOrder] = useState<"ascending" | "descending">("ascending");
    const [fillHeight, setFillHeight] = useState(false);
    const [buttonHeight, setButtonHeight] = useState(76);
    const [fontSize, setFontSize] = useState(32);
    const [px, setPx] = useState(0);
    const [py, setPy] = useState(0);

    return (
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Paper variant="outlined" sx={{ width: 280, height: fillHeight ? 420 : "auto" }}>
                <NumberKeypad
                    value={value}
                    onChange={setValue}
                    min={min}
                    max={max}
                    digitOrder={digitOrder}
                    fillHeight={fillHeight}
                    buttonHeight={buttonHeight}
                    fontSize={fontSize}
                    px={px}
                    py={py}
                />
            </Paper>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 240 }}>
                <Typography variant="h6">value: {value}</Typography>
                <TextField
                    label="min"
                    type="number"
                    size="small"
                    value={min}
                    onChange={(e) => setMin(Number(e.target.value) || 0)}
                />
                <TextField
                    label="max"
                    type="number"
                    size="small"
                    value={max}
                    onChange={(e) => setMax(Number(e.target.value) || 0)}
                />
                <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={digitOrder}
                    onChange={(_e, next) => next && setDigitOrder(next)}
                >
                    <ToggleButton value="ascending">ascending</ToggleButton>
                    <ToggleButton value="descending">descending</ToggleButton>
                </ToggleButtonGroup>
                <FormControlLabel
                    control={<Switch checked={fillHeight} onChange={(e) => setFillHeight(e.target.checked)} />}
                    label="fillHeight"
                />
                <TextField
                    label="buttonHeight (px)"
                    type="number"
                    size="small"
                    value={buttonHeight}
                    onChange={(e) => setButtonHeight(Number(e.target.value) || 0)}
                />
                <TextField
                    label="fontSize (px)"
                    type="number"
                    size="small"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value) || 0)}
                />
                <TextField
                    label="px (padding-x, MUI spacing)"
                    type="number"
                    size="small"
                    value={px}
                    onChange={(e) => setPx(Number(e.target.value) || 0)}
                />
                <TextField
                    label="py (padding-y, MUI spacing)"
                    type="number"
                    size="small"
                    value={py}
                    onChange={(e) => setPy(Number(e.target.value) || 0)}
                />
            </Box>
        </Box>
    );
}

function CalculatorDemo() {
    const [liveInput, setLiveInput] = useState("");
    const [buttonHeight, setButtonHeight] = useState(76);
    const [fontSize, setFontSize] = useState(32);
    const [px, setPx] = useState(2);
    const [py, setPy] = useState(2);

    return (
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Paper variant="outlined" sx={{ width: 320 }}>
                <NumberKeypad
                    variant="calculator"
                    liveInput={liveInput}
                    buttonHeight={buttonHeight}
                    fontSize={fontSize}
                    px={px}
                    py={py}
                />
            </Paper>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 240 }}>
                <Typography variant="body2" color="text.secondary">
                    이 입력칸에 타이핑하면 계산기 표시부에 그대로 미러링됩니다(liveInput). 실제 금액 입력란처럼
                    formatExpressionInput 으로 정리한 값을 넘긴다(연산자 연달아 입력해도 마지막 것만 남음).
                    계산기는 이 입력칸의 keydown 을 알 수 없으므로, Enter 로 확정 계산하는 건 이 입력칸(소비 측)
                    책임이다 — evaluateExpression 으로 직접 계산해 값을 되돌려 넣는다.
                </Typography>
                <TextField
                    label="liveInput"
                    size="small"
                    value={liveInput}
                    onChange={(e) => setLiveInput(formatExpressionInput(e.target.value))}
                    onKeyDown={(e) => {
                        if (e.key !== "Enter") return;
                        const result = evaluateExpression(liveInput);
                        if (result !== null) setLiveInput(String(result));
                    }}
                />
                <TextField
                    label="buttonHeight (px)"
                    type="number"
                    size="small"
                    value={buttonHeight}
                    onChange={(e) => setButtonHeight(Number(e.target.value) || 0)}
                />
                <TextField
                    label="fontSize (px)"
                    type="number"
                    size="small"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value) || 0)}
                />
                <TextField
                    label="px (padding-x, MUI spacing)"
                    type="number"
                    size="small"
                    value={px}
                    onChange={(e) => setPx(Number(e.target.value) || 0)}
                />
                <TextField
                    label="py (padding-y, MUI spacing)"
                    type="number"
                    size="small"
                    value={py}
                    onChange={(e) => setPy(Number(e.target.value) || 0)}
                />
            </Box>
        </Box>
    );
}

function App() {
    const [tab, setTab] = useState(0);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                @ehfuse/number-pad
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                NumberKeypad variant 예제
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 3, mb: 3 }}>
                <Tabs value={tab} onChange={(_e, next) => setTab(next)}>
                    <Tab label="numpad" />
                    <Tab label="calculator" />
                </Tabs>
            </Box>

            {tab === 0 && <NumpadDemo />}
            {tab === 1 && <CalculatorDemo />}
        </Container>
    );
}

export default App;
