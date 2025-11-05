const Merchant = require("../models/Merchent")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
const Merchent = require("../models/Merchent");
const redis = require("../config/redis")

exports.registerMerchent= async (req, res)=>{
    try{
        const {ownerName, businessType, storeName, phone, email, password, address} = req.body;
        const existing = await Merchant.findOne({phone});
        if(existing) return res.status(400).json({message:"Merchant already exists with this phone"});
        const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
        const merchant = new Merchent({
            ownerName,
            businessType,
            storeName,
            phone,
            email,
            password: hashedPassword,
            address,
        })
        await merchant.save();

        await redis.del("all_merchants")

        res.status(201).json({message: "Merchant registered successfully", merchant })
    }catch(err){
        console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
    }
}
exports.loginMerchant = async(req, res)=>{
    try {
        const {phone, password} = req.body;
        const merchant = await Merchant.findOne({phone});
        if(!merchant) return res.status(404).json({message:"Merchant Not Found"});
        const isMatch = await bcrypt.compare(password, merchant.password || "");
        if(!isMatch) return res.status(400).json({message: "Invalid credentials" });
        const token = jwt.sign({id: merchant._id}, process.env.secret_key, {expiresIn: "7d"});
        res.json({message: "Login Successfull", token, merchant});
    } catch (error) {
        res.status(500).json({message:"Server Error", error:error.message})
    }
}
exports.getMerchantById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `merchant_${id}`;

    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached)); // ✅ serve from cache

    const merchant = await Merchant.findById(id);
    if (!merchant) return res.status(404).json({ message: "Merchant not found" });

    await redis.set(cacheKey, JSON.stringify(merchant), "EX", 120); // cache for 2 mins
    res.json(merchant);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

exports.getAllMerchants = async (req, res) => {
  try {
    const cacheKey = "all_merchants";
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached)); // ✅ serve from cache

    const merchants = await Merchant.find();
    await redis.set(cacheKey, JSON.stringify(merchants), "EX", 60); // cache for 1 min
    res.json(merchants);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};