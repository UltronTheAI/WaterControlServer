const express = require('express');
const bodyParser = require('body-parser'); // Ensure body-parser is required
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb'); // Ensure ObjectId is imported

require('dotenv').config();
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.PASSWORD}@watercontrol.zffpj.mongodb.net/?retryWrites=true&w=majority&appName=${process.env.DB}`;

const app = express();
app.use(bodyParser.json()); // Configure body-parser middleware to handle JSON

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);

app.post('/addHistory', async (req, res) => {
    const { dateTime, machineStatus, floor, apiKey } = req.body;

    try {
        await client.connect();
        const database = client.db('WaterControl');
        const usersCollection = database.collection('Users');
        const historyCollection = database.collection('History');
        const machineCollection = database.collection('Machine');

        // Validate user API key
        const user = await usersCollection.findOne({ API: apiKey });
        if (!user) {
            return res.status(401).send('Invalid API key');
        }

        // Add data to history
        const historyData = { dateTime, machineStatus, floor, userId: user._id };
        await historyCollection.insertOne(historyData);

        // Modify machine documents
        await machineCollection.updateMany(
            { floor },
            { $set: { machineStatus } }
        );

        res.status(200).send('Data added to history and machine documents updated');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

app.get('/getUserInfo', async (req, res) => {
    const userName = req.query.userName;
    const password = req.query.password;

    if (!userName || !password) {
        return res.status(400).send('User name and password are required');
    }

    try {
        await client.connect();
        const database = client.db('WaterControl');
        const collection = database.collection('Users');
        const user = await collection.findOne({ User: userName, Password: password });

        if (user) {
            res.json({ API: user.API, Floor: user.Floor });
        } else {
            res.status(404).send('User not found or incorrect password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

app.get('/getMachineDetails', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('WaterControl');
        const historyCollection = database.collection('Machine');

        // Get the latest document added to history collection
        const latestHistory = await historyCollection.findOne({}, { sort: { _id: -1 } });

        if (!latestHistory) {
            return res.status(404).send('No history data found');
        }

        res.json(latestHistory);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

app.get('/getLatestHistory', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('WaterControl');
        const historyCollection = database.collection('History');

        // Get the latest document added to history collection
        const latestHistory = await historyCollection.findOne({}, { sort: { _id: -1 } });

        if (!latestHistory) {
            return res.status(404).send('No history data found');
        }

        res.json(latestHistory);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

app.get('/getFullHistory', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('WaterControl');
        const historyCollection = database.collection('History');

        // Retrieve the full history
        const fullHistory = await historyCollection.find({}).toArray();

        if (fullHistory.length === 0) {
            return res.status(404).send('No history data found');
        }

        res.json(fullHistory);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

app.post('/addMachineDetails', async (req, res) => {
    const { date, waterFilled, machineStatus, apiKey } = req.body;

    try {
        await client.connect();
        const database = client.db('WaterControl');
        const usersCollection = database.collection('Users');
        const machineCollection = database.collection('Machine');

        // Validate user API key
        const user = await usersCollection.findOne({ API: apiKey });
        if (!user) {
            return res.status(401).send('Invalid API key');
        }

        // Add data to history
        const machineData = { waterFilled, machineStatus, date, userId: user._id };
        await machineCollection.insertOne(machineData);

        // // Modify machine documents
        // await machineCollection.updateMany(
        //     { waterFilled},
        //     { $set: { machineStatus } }
        // );

        res.status(200).send('Data added to history and machine documents updated');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
