const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');


// Need to be deleted
const path = require("path");
const serviceAccount = require(path.resolve(__dirname, "firebase-adminsdk.json"));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@durjoys-db.smvgnqx.mongodb.net/?retryWrites=true&w=majority&appName=Durjoys-DB`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        //*All Codes Come here*//
        const db = client.db('PlateShare_DB_Admin');
        const usersCollection = db.collection('users');//Users with their role
        const charityCollection = db.collection('charity');//Charity that are beimg done
        const paymentCollection = db.collection('payments');

        // Creating a new user

        // GET /users or /users?email=someone@example.com
        app.get('/users', async (req, res) => {
            const email = req.query.email;

            try {
                if (email) {
                    // Fetch single user by email
                    const user = await usersCollection.findOne({ email });

                    if (!user) {
                        return res.status(404).json({ message: 'User not found' });
                    }

                    return res.status(200).json(user);
                } else {
                    // Fetch all users
                    const users = await usersCollection.find({}).toArray();
                    return res.status(200).json({ message: 'Users retrieved successfully', users });
                }
            } catch (error) {
                console.error('Error retrieving user(s):', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });



        // POST API to save user
        app.post('/users', async (req, res) => {
            try {
                const { name, email, photo, role, created_at, last_login_at } = req.body;


                // Check if user already exists
                const existingUser = await usersCollection.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: 'User with this email already exists' });
                }

                // Create new user
                const newUser = {
                    name,
                    email,
                    photo,
                    role,
                    created_at,
                    last_login_at,
                };

                // Insert user into MongoDB
                const result = await usersCollection.insertOne(newUser);

                res.status(201).json({ message: 'User registered successfully', user: { _id: result.insertedId, ...newUser } });
            } catch (error) {
                console.error('Error saving user:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });


        // PATCH API to update user role
        app.patch('/users/:id/role', async (req, res) => {
            try {
                const { id } = req.params;
                const { role } = req.body;

                // Validate role
                if (!['admin', 'restaurant', 'charity', 'user'].includes(role)) {
                    return res.status(400).json({ message: 'Invalid role. Must be admin, restaurant, charity, or user' });
                }

                // Update user role
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role } }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.status(200).json({ message: 'User role updated successfully' });
            } catch (error) {
                console.error('Error updating user role:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        // DELETE API to delete user
        app.delete('/users/:id', async (req, res) => {
            const userId = req.params.id;

            try {
                // Get user info from MongoDB to find Firebase UID
                const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

                if (!user) {
                    return res.status(404).send({ error: 'User not found in DB' });
                }

                // Delete from Firebase Auth
                if (user.firebaseUid) {
                    await admin.auth().deleteUser(user.firebaseUid);
                }

                // Delete from MongoDB
                await usersCollection.deleteOne({ _id: new ObjectId(userId) });

                res.send({ success: true, message: 'User deleted from DB and Firebase' });
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

// Simple Route
app.get('/', (req, res) => {
    res.send('PlateShare server is running');
});

app.listen(port, () => console.log(`PlateShare Server running on port ${port}`));
