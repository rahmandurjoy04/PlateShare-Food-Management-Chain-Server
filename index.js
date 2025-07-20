const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require('firebase-admin');

const stripe = require("stripe")(process.env.Payment_GateWay_Key);

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
        const resturantDonationsCollection = db.collection('resturantDonations');//Donations by resturant that are being made
        const charityPickupRequestsCollection = db.collection('charityRequests');//Request from a charity to make a delivery or pickup
        const roleRequestCollection = db.collection('roleRequests');
        const transactionsCollection = db.collection('transactions');

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


        // GET all or filtered role requests
        app.get('/roleRequests', async (req, res) => {
            try {
                const email = req.query.email;

                let query = {};
                if (email) {
                    query.email = email;
                }

                const roleRequests = await roleRequestCollection.findOne(query);
                res.status(200).json(roleRequests);
            } catch (error) {
                console.error('Error retrieving role requests:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        // GET all or filtered role requests
        app.get('/allRoleRequests', async (req, res) => {
            try {
                const email = req.query.email;
                let query = {};
                if (email) {
                    query.email = email;
                }
                const roleRequests = await roleRequestCollection.find(query).toArray();
                res.status(200).json(roleRequests);
            } catch (error) {
                console.error('Error retrieving role requests:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        // Getting All Donations
        app.get('/donations', async (req, res) => {
            try {
                const donations = await resturantDonationsCollection.find({}).toArray();
                res.status(200).json(donations);
            } catch (error) {
                console.error('Error fetching donations:', error);
                res.status(500).json({ message: 'Failed to fetch donations', error: error.message });
            }
        });


        // GET: My Donations
        app.get('/donations/my-donations', async (req, res) => {
            const email = req.query.email;

            if (!email) {
                return res.status(400).json({ message: 'Email query is required' });
            }

            try {
                const myDonations = await resturantDonationsCollection
                    .find({ restaurantEmail: email })
                    .sort({ createdAt: -1 })
                    .toArray();

                res.status(200).json({ message: 'Donations fetched successfully', donations: myDonations });
            } catch (error) {
                console.error('Error fetching donations:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        // Get donation by ID
        app.get('/donations/:id', async (req, res) => {
            const { id } = req.params;

            try {
                const donation = await resturantDonationsCollection.findOne({ _id: new ObjectId(id) });

                if (donation) {
                    res.status(200).json(donation);
                } else {
                    res.status(404).json({ message: 'Donation not found' });
                }
            } catch (error) {
                console.error('Error fetching donation:', error);
                res.status(500).json({ message: 'Server error' });
            }
        });

        app.get('/alldonations/verified', async (req, res) => {
            try {
                const verifiedDonations = await resturantDonationsCollection
                    .find({ status: 'Verified' })
                    .toArray();

                res.status(200).json(verifiedDonations);
            } catch (error) {
                console.error('Error fetching verified donations:', error);
                res.status(500).json({ message: 'Failed to fetch verified donations', error: error.message });
            }
        });

        app.get('/donation-requests', async (req, res) => {
            try {
                const email = req.query.email;

                let query = {};
                if (email) {
                    query.charityEmail = email;  // filter by charityEmail if email is provided
                }

                const requests = await charityPickupRequestsCollection.find(query).toArray();

                res.status(200).json(requests);
            } catch (error) {
                res.status(500).json({ message: 'Failed to fetch donation requests', error: error.message });
            }
        });


        // Getting Featured Donations
        app.get('/featuredDonations', async (req, res) => {
            try {
                const featuredDonations = await resturantDonationsCollection
                    .find({ featured: true })
                    .sort({ featuredAt: -1 })
                    .toArray();

                res.status(200).json(featuredDonations);
            } catch (error) {
                res.status(500).json({ message: 'Failed to fetch featured donations', error: error.message });
            }
        });

        // GET confirmed pickups by charity
        app.get('/pickups', async (req, res) => {
            const charityEmail = req.query.email;

            const query = {};
            if (charityEmail) {
                query.charityEmail = charityEmail;
            }

            query.status = 'Accepted'; // Only show confirmed pickups

            try {
                const pickups = await charityPickupRequestsCollection.find(query).toArray();
                res.status(200).json(pickups);
            } catch (error) {
                res.status(500).json({
                    message: 'Failed to fetch pickups',
                    error: error.message
                });
            }
        });


        // Received or completed Deliveries For Charity
        app.get('/received-donations', async (req, res) => {
            const charityEmail = req.query.email;

            if (!charityEmail) {
                return res.status(400).json({ message: 'Charity email is required as query parameter' });
            }

            try {
                // 1. Find all charity pickup requests with status "Picked Up" for this charity
                const pickupRequests = await charityPickupRequestsCollection
                    .find({ charityEmail, status: 'Picked Up' })
                    .toArray();

                // 2. Extract donationIds from these requests
                const donationIds = pickupRequests.map(req => new ObjectId(req.donationId));

                // 3. Fetch all related donations from resturantDonationsCollection
                const donations = await resturantDonationsCollection
                    .find({ _id: { $in: donationIds }, delivery_status: 'Picked Up' }) // Optional: filter by delivery_status if needed
                    .toArray();

                // 4. Merge pickup requests with donation details
                const combined = pickupRequests.map(req => {
                    const donation = donations.find(d => d._id.toString() === req.donationId);
                    return {
                        ...req,
                        donationTitle: req.donationTitle || donation?.title,
                        restaurantName: req.restaurantName || donation?.restaurantName,
                        foodType: donation?.foodType,
                        quantity: donation?.quantity,
                        pickupTime: donation?.pickupTime,
                        deliveryStatus: donation?.delivery_status,
                    };
                });

                res.status(200).json(combined);
            } catch (error) {
                console.error('Error fetching received donations:', error);
                res.status(500).json({ message: 'Failed to fetch received donations', error: error.message });
            }
        });




        // POST API to save user
        app.post('/users', async (req, res) => {
            try {
                const { name, email, photo, role, created_at, last_login_at, firebaseUid } = req.body;


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
                    firebaseUid,
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

        // Post api for payment intent
        app.post('/create-payment-intent', async (req, res) => {
            try {
                const { amount } = req.body;

                if (!amount || typeof amount !== 'number') {
                    return res.status(400).json({ error: 'Invalid or missing amount.' });
                }

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(amount),
                    currency: 'usd',
                    payment_method_types: ['card'],
                });

                res.send({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                console.error('Error creating payment intent:', error);
                res.status(500).json({ error: 'Failed to create payment intent.' });
            }
        });


        // Posting the roleReques data in db
        app.post('/roleRequest', async (req, res) => {
            try {
                const request = req.body;

                console.log(request);

                if (!request.transactionId || !request.amount) {
                    return res.status(400).json({ error: 'Missing payment data.' });
                }

                const result = await roleRequestCollection.insertOne(request);
                res.status(201).json({ message: 'Payment saved successfully', result });
            } catch (error) {
                console.error('Error saving payment:', error);
                res.status(500).json({ error: 'Failed to save payment.' });
            }
        });

        // Saving the transactions data
        app.post('/transactions', async (req, res) => {
            try {
                const transaction_data = req.body;

                const result = await transactionsCollection.insertOne(transaction_data);
                res.status(201).json({ message: 'Transactions saved successfully', result });
            } catch (error) {
                console.error('Error saving Transactions:', error);
                res.status(500).json({ error: 'Failed to save Transactions.' });
            }
        });

        // Creation of donation by resturant
        app.post('/donations', async (req, res) => {
            try {
                const donation = req.body;

                donation.createdAt = new Date();
                donation.status = donation.status || 'pending';

                const result = await resturantDonationsCollection.insertOne(donation);

                res.status(201).json({
                    message: 'Donation added successfully',
                    insertedId: result.insertedId
                });
            } catch (error) {
                console.error('Error adding donation:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });


        // Requests By Charity done to make a donation Pickup
        app.post('/donation-requests', async (req, res) => {
            try {
                const request = req.body;
                const result = await charityPickupRequestsCollection.insertOne({
                    ...request,
                    status: 'Pending',
                    delivery_status: 'Requested',
                    createdAt: new Date().toISOString(),
                });
                res.status(201).json({ message: 'Request submitted', insertedId: result.insertedId });
            } catch (error) {
                res.status(500).json({ message: 'Failed to submit request', error: error.message });
            }
        });




        // PATCH user by email to update last login (and optionally name/photo)
        app.patch('/users', async (req, res) => {
            try {
                const email = req.query.email;
                const { last_login_at, name, photo, role } = req.body;

                const updateDoc = {
                    $set: {
                        last_login_at,
                        role,
                        ...(name && { name }),
                        ...(photo && { photo })
                    }
                };

                const result = await usersCollection.updateOne(
                    { email },
                    updateDoc
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.status(200).json({ message: 'User login time updated successfully' });
            } catch (error) {
                console.error('Error updating user login:', error);
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

        // // PATCH role request status (approve or reject)
        app.patch('/roleRequests/:id', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;

            if (!['approved', 'rejected'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status. Must be "approved" or "rejected"' });
            }

            try {
                // Find existing role request
                const roleRequest = await roleRequestCollection.findOne({ _id: new ObjectId(id) });
                if (!roleRequest) {
                    return res.status(404).json({ message: 'Role request not found' });
                }

                // Update the role request status
                const updateResult = await roleRequestCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { charity_role_status: status } }
                );

                // If approved, update user role to 'charity'
                if (status === 'approved') {
                    await usersCollection.updateOne(
                        { email: roleRequest.email },
                        { $set: { role: 'charity' } }
                    );
                }

                // Fetch the updated role request document
                const updatedRequest = await roleRequestCollection.findOne({ _id: new ObjectId(id) });

                // Respond with message and updated document
                return res.status(200).json({
                    message: `Role request has been ${status} successfully.`,
                    modifiedCount: updateResult.modifiedCount,
                    updatedRequest,
                });
            } catch (error) {
                console.error('Error updating role request:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        // PATCH update donation by ID
        app.patch('/donations/:id', async (req, res) => {
            const { id } = req.params;
            const newData = req.body;

            try {
                const filter = { _id: new ObjectId(id) };
                const existing = await resturantDonationsCollection.findOne(filter);

                if (!existing) {
                    return res.status(404).json({ message: 'Donation not found' });
                }

                const changedFields = {};
                const fieldsToCheck = ['title', 'foodType', 'quantity', 'pickupTime', 'location', 'image'];

                let hasChanges = false;

                for (const field of fieldsToCheck) {
                    if (newData[field] !== existing[field]) {
                        changedFields[field] = newData[field];
                        hasChanges = true;
                    }
                }

                if (!hasChanges) {
                    return res.status(200).json({ message: 'No meaningful changes made', modified: false });
                }

                const updateDoc = {
                    $set: {
                        ...changedFields,
                        updatedAt: new Date().toISOString(),
                    },
                };

                const result = await resturantDonationsCollection.updateOne(filter, updateDoc);

                res.status(200).json({
                    message: 'Donation updated successfully',
                    modifiedCount: result.modifiedCount
                });
            } catch (error) {
                console.error('Update error:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });


        app.patch('/donations/:id/status', async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            try {
                const result = await resturantDonationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            status,
                            delivery_status: 'Available',
                            updatedAt: new Date().toISOString()
                        }
                    }
                );
                res.status(200).json({ message: `Donation ${status}`, modifiedCount: result.modifiedCount });
            } catch (error) {
                res.status(500).json({ message: 'Failed to update status', error: error.message });
            }
        });


        // Addng featured Field When Admin Clicks Feature
        app.patch('/donations/:id/feature', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await resturantDonationsCollection.updateOne(
                    { _id: new ObjectId(id) },
                    {
                        $set: {
                            featured: true,
                            featuredAt: new Date().toISOString()  // Add this field instead of updatedAt
                        }
                    }
                );

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: 'Donation marked as featured' });
                } else {
                    res.status(404).json({ message: 'Donation not found or already featured' });
                }
            } catch (error) {
                res.status(500).json({ message: 'Failed to update donation', error: error.message });
            }
        });


        // Accepting Requests from Resturant To charity 
        app.patch('/donation-requests/status/:id', async (req, res) => {
            const requestId = req.params.id;
            const { status, donationId } = req.body;

            if (!['Accepted', 'Rejected'].includes(status)) {
                return res.status(400).json({ message: 'Invalid status value.' });
            }

            try {
                // 1. Update the selected request's status
                const result = await charityPickupRequestsCollection.updateOne(
                    { _id: new ObjectId(requestId) },
                    { $set: { status } }
                );

                // 2. If Accepted:
                if (status === 'Accepted' && donationId) {
                    // a. Reject other requests
                    await charityPickupRequestsCollection.updateMany(
                        {
                            donationId,
                            _id: { $ne: new ObjectId(requestId) },
                            status: 'Pending'
                        },
                        { $set: { status: 'Rejected' } }
                    );

                    // b. Update delivery_status of the donation
                    await resturantDonationsCollection.updateOne(
                        { _id: new ObjectId(donationId) },
                        { $set: { delivery_status: 'Requested' } }
                    );
                }

                res.status(200).json({
                    message: `Request ${status.toLowerCase()} successfully.`,
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount
                });

            } catch (error) {
                console.error('Error updating request status:', error);
                res.status(500).json({ message: 'Failed to update request status', error: error.message });
            }
        });


        // Make donation as picked up bu Charity
        app.patch('/donations/:id/pickup', async (req, res) => {
            const donationId = req.params.id;

            try {
                // 1. Update the donation's delivery_status to "Picked Up"
                const donationResult = await resturantDonationsCollection.updateOne(
                    { _id: new ObjectId(donationId) },
                    { $set: { delivery_status: 'Picked Up' } }
                );

                // 2. Update all accepted pickup requests for this donation to "Picked Up"
                const acceptedUpdateResult = await charityPickupRequestsCollection.updateMany(
                    {
                        donationId,
                        status: 'Accepted'
                    },
                    { $set: { status: 'Picked Up' } }
                );

                // 3. Reject all other pending pickup requests for this donation
                const rejectedUpdateResult = await charityPickupRequestsCollection.updateMany(
                    {
                        donationId,
                        status: 'Pending'
                    },
                    { $set: { status: 'Rejected' } }
                );

                res.status(200).json({
                    message: 'Donation marked as Picked Up; accepted requests updated; pending requests rejected.',
                    updatedDonation: donationResult.modifiedCount,
                    acceptedRequestsUpdated: acceptedUpdateResult.modifiedCount,
                    pendingRequestsRejected: rejectedUpdateResult.modifiedCount
                });

            } catch (error) {
                console.error('Error in pickup confirmation:', error);
                res.status(500).json({
                    message: 'Failed to confirm pickup',
                    error: error.message
                });
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


        // Delete donation by ID and email
        app.delete('/donations/:id', async (req, res) => {
            const donationId = req.params.id;

            console.log(donationId);

            try {
                const result = await resturantDonationsCollection.deleteOne({
                    _id: new ObjectId(donationId),
                });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Donation deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Donation not found or not owned by this user' });
                }
            } catch (error) {
                console.error('Delete error:', error);
                res.status(500).json({ message: 'Server error' });
            }
        });


        // DELETE a specific donation request by ID from admin
        app.delete('/donation-requests/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await charityPickupRequestsCollection.deleteOne({ _id: new ObjectId(id) });
                res.status(200).json({
                    message: 'Request deleted successfully',
                    deletedCount: result.deletedCount,
                });
            } catch (error) {
                res.status(500).json({ message: 'Failed to delete request', error: error.message });
            }
        });


        // Delete charity Requests Made by Charity
        app.delete('/donation-requests/:id', async (req, res) => {
            const requestId = req.params.id;
            const charityEmail = req.query.charityEmail;

            if (!charityEmail) {
                return res.status(400).json({ message: 'Charity email is required' });
            }

            try {
                // Find the request first
                const existingRequest = await charityPickupRequestsCollection.findOne({ _id: new ObjectId(requestId) });

                if (!existingRequest) {
                    return res.status(404).json({ message: 'Request not found' });
                }

                if (existingRequest.charityEmail !== charityEmail) {
                    return res.status(403).json({ message: 'Unauthorized: Email does not match' });
                }

                // If email matches, proceed to delete
                const result = await charityPickupRequestsCollection.deleteOne({ _id: new ObjectId(requestId) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: 'Request cancelled successfully' });
                } else {
                    res.status(500).json({ message: 'Failed to delete request' });
                }
            } catch (error) {
                console.error('Error cancelling request:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
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
