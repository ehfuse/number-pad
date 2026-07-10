import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";

// 기존 dist 폴더가 있으면 삭제
if (existsSync("dist")) {
    rmSync("dist", { recursive: true, force: true });
}

try {
    // TypeScript 컴파일러로 타입 정의 파일만 생성
    console.log("Generating TypeScript declarations...");
    execSync("npx tsc --emitDeclarationOnly --outDir dist", {
        stdio: "inherit",
    });

    console.log("TypeScript declarations generated successfully!");
} catch (error) {
    console.error("Failed to generate TypeScript declarations:", error);
    process.exit(1);
}
