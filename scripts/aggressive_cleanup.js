const fs = require('fs');
const path = require('path');

const docsPath = "C:\\Users\\Devang chauhan\\OneDrive\\Desktop\\MaaKiRasoi\\Admin Panel\\admin-panel\\backend\\partner_docs";

async function cleanup() {
    console.log(`Starting aggressive cleanup in: ${docsPath}`);
    try {
        if (!fs.existsSync(docsPath)) {
            console.log("Error: Path does not exist.");
            return;
        }

        const files = fs.readdirSync(docsPath);
        console.log(`Found ${files.length} files.`);

        for (const file of files) {
            const filePath = path.join(docsPath, file);
            try {
                // Remove read-only attribute if it exists
                fs.chmodSync(filePath, 0o666);
                fs.unlinkSync(filePath);
                console.log(`Deleted: ${file}`);
            } catch (e) {
                console.error(`Failed to delete ${file}: ${e.message}`);
            }
        }
        console.log("Cleanup attempt finished.");
    } catch (err) {
        console.error(`Global error: ${err.message}`);
    }
}

cleanup();
