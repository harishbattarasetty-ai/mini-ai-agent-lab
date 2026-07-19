export function createProject(name: string) {
    console.log("\n========================");
    console.log("📦 Backend Tool Executed");
    console.log("========================");

    console.log(`Creating project: ${name}`);

    return {
        success: true,
        projectId: Math.floor(Math.random() * 1000),
        name,
    };
}