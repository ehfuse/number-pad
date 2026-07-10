import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// "@": ../src 를 통해 라이브러리 소스를 프로젝트 루트(example) 밖에서 그대로 불러와 테스트한다.
// 이 소스가 import하는 react/@mui/@emotion/@ehfuse/alerts 는 number-pad 루트의 node_modules 에도
// 별도로 설치되어 있어(빌드용 devDependencies), Node 식 해석을 그대로 두면 example 과 다른 두 번째
// 사본이 로드되어 "Invalid hook call" 등 컨텍스트 불일치 오류가 난다. 아래 alias 로 example 의
// node_modules 사본 하나로 강제 고정한다.
function pinToExampleNodeModules(pkg: string) {
    return {
        find: new RegExp(`^${pkg.replace(/\//g, "\\/")}(\\/.*)?$`),
        replacement: path.resolve(__dirname, "node_modules", pkg) + "$1",
    };
}

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: "@", replacement: path.resolve(__dirname, "../src") },
            ...[
                "react",
                "react-dom",
                "@mui/material",
                "@mui/icons-material",
                "@emotion/react",
                "@emotion/styled",
                "@ehfuse/alerts",
            ].map(pinToExampleNodeModules),
        ],
    },
});
