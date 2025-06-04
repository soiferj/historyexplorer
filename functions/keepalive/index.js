// Azure Function: Timer trigger to ping Render server every 5 minutes
// Language: JavaScript (Node.js 18+)

/**
 * This function pings your Render server every 5 minutes to keep it awake.
 * Deploy this folder as an Azure Function App.
 */

module.exports = async function (context, myTimer) {
    const url = "https://historyexplorerserver.onrender.com/events";
    try {
        const res = await fetch(url);
        context.log(`Pinged ${url}, status: ${res.status}`);
    } catch (err) {
        context.log(`Ping failed: ${err}`);
    }
};
