const User = require("../models/User");
const client = require("../config/whatsappClient");

exports.saveAddressFromChat = async (phone, address) => {
  let user = await User.findOneAndUpdate(
    { phone },
    { address },
    { new: true, upsert: true }
  );

  await client.sendMessage(`${phone}@c.us`,
`✅ Address Saved!
Now you can continue ordering.

Example:
"Biryani under 200"`);
  
  return user;
};
