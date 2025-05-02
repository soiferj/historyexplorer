const express = require("express");
const router = express.Router();
const driver = require("../db");

// Link two events
router.post("/", async (req, res) => {
    const { event1, event2, relation } = req.body;
    const session = driver.session();

    try {
        await session.run(
            `MATCH (a:Event {id: $event1}), (b:Event {id: $event2}) 
             MERGE (a)-[:${relation}]->(b)`,
            { event1, event2 }
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await session.close();
    }
});

module.exports = router;
