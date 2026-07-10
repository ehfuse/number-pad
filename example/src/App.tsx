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
import { NumberKeypad } from "@/index";

function NumpadDemo() {
    const [value, setValue] = useState(0);
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(999);
    const [digitOrder, setDigitOrder] = useState<"ascending" | "descending">("ascending");
    const [fillHeight, setFillHeight] = useState(false);

    return (
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Paper variant="outlined" sx={{ p: 2, width: 280, height: fillHeight ? 420 : "auto" }}>
                <NumberKeypad
                    value={value}
                    onChange={setValue}
                    min={min}
                    max={max}
                    digitOrder={digitOrder}
                    fillHeight={fillHeight}
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
            </Box>
        </Box>
    );
}

function CalculatorDemo() {
    const [liveInput, setLiveInput] = useState("");

    return (
        <Box sx={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <Paper variant="outlined" sx={{ p: 2, width: 320 }}>
                <NumberKeypad variant="calculator" liveInput={liveInput} />
            </Paper>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 240 }}>
                <Typography variant="body2" color="text.secondary">
                    이 입력칸에 타이핑하면 계산기 표시부에 그대로 미러링됩니다(liveInput).
                </Typography>
                <TextField
                    label="liveInput"
                    size="small"
                    value={liveInput}
                    onChange={(e) => setLiveInput(e.target.value)}
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
