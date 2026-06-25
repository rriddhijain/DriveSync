const { classifyMessageIntent, summarizeQueue } = require('./prompts');

const mockQueue = [
    { sender: "Mom", text: "Are you coming for dinner tonight?" },
    { sender: "Boss", text: "Did you send the Q3 report? We need it now." },
    { sender: "Unknown", text: "Your Amazon package is out for delivery." },
    { sender: "Wife", text: "Can you pick up milk on the way home?" }
];

async function runTest() {
    console.log("🔥 Waking up edge AI...");
    
    console.log("\n--- Testing Emergency Gatekeeper ---");
    const emergencyIntent = await classifyMessageIntent("Help, I just got into a car accident and need an ambulance!");
    console.log(`Intent (Should be EMERGENCY): ${emergencyIntent}`);

    const spamIntent = await classifyMessageIntent("Get 20% off your next Uber ride!");
    console.log(`Intent (Should be SPAM): ${spamIntent}`);

    console.log("\n--- Testing Queue Summarizer ---");
    const summary = await summarizeQueue(mockQueue);
    console.log(`\nSummary Output:\n"${summary}"`);
}

runTest();