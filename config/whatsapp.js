require("dotenv").config();
const axios = require("axios");

async function sendTemplateMessage() {
  const response = await axios.post(
    `https://graph.facebook.com/v22.0/905586875961713/messages`,
    {
      messaging_product: "whatsapp",
      to: '917095835048',
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: "Welcome 😊 What would you like to do?",
        },
        action: {
          buttons: [
            {
              type: "reply",
              reply: { id: "ORDER_FOOD", title: "🍽 Order Food" },
            },
            {
              type: "reply",
              reply: { id: "ORDER_GROCERY", title: "🛒 Order Groceries" },
            },
            {
              type: "reply",
              reply: { id: "ORDER_MEDICINE", title: "💊 Order Medicine" },
            },
            
          ],
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer EAATRMkskE2oBPww0xMoCWEqMtKUORrP1LEjq1THZBkxeEjQZBFQmBzVPyf7Am2NxUVD9sycfJwWek4Eh7Xm0PYiuSGw9P178vs8AttspbKiDx6L7PZCK3ADTzZBDWmnmAcdlwZCzqzcNOktQ5QAyEYfyfjQEzDEMmzfmHQlYn99559KgnXiq5SXQWg8ty22ElfHQUq74SdI8BUmSr4yySdOgg28elOYQPZAZCZB2taHV5In9mJTF3rTO5oBVRm9ZCVY00M2BLwR1cLE5y9IYdb0SEzt6ZCQgZDZD`,
        "Content-Type": "application/json",
      },
    }
  );

  console.log(response.data);
}

async function sendTextMessage(){
    const response = await axios({
        url: `https://graph.facebook.com/v22.0/905586875961713/messages`,
        method: 'post',
        headers: {
        Authorization: `Bearer EAATRMkskE2oBPww0xMoCWEqMtKUORrP1LEjq1THZBkxeEjQZBFQmBzVPyf7Am2NxUVD9sycfJwWek4Eh7Xm0PYiuSGw9P178vs8AttspbKiDx6L7PZCK3ADTzZBDWmnmAcdlwZCzqzcNOktQ5QAyEYfyfjQEzDEMmzfmHQlYn99559KgnXiq5SXQWg8ty22ElfHQUq74SdI8BUmSr4yySdOgg28elOYQPZAZCZB2taHV5In9mJTF3rTO5oBVRm9ZCVY00M2BLwR1cLE5y9IYdb0SEzt6ZCQgZDZD`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '917095835048',
        type: 'text',
        text:{
            body: 'This is a Text message from testing'
        }
      })
    })
    console.log(response.data);
}
async function sendMediaMessage(){
    const response = await axios({
        url: `https://graph.facebook.com/v22.0/905586875961713/messages`,
        method: 'post',
        headers: {
        Authorization: `Bearer EAATRMkskE2oBPww0xMoCWEqMtKUORrP1LEjq1THZBkxeEjQZBFQmBzVPyf7Am2NxUVD9sycfJwWek4Eh7Xm0PYiuSGw9P178vs8AttspbKiDx6L7PZCK3ADTzZBDWmnmAcdlwZCzqzcNOktQ5QAyEYfyfjQEzDEMmzfmHQlYn99559KgnXiq5SXQWg8ty22ElfHQUq74SdI8BUmSr4yySdOgg28elOYQPZAZCZB2taHV5In9mJTF3rTO5oBVRm9ZCVY00M2BLwR1cLE5y9IYdb0SEzt6ZCQgZDZD`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({
        messaging_product: 'whatsapp',
        to: '917095835048',
        type: 'image',
        image:{
            link: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT1lKH9EbWJC_pCNYK-HjfploTD7P0SH8xaa5bW1f4fLRJoHujHUOT5SHnao9NOx7BJWXSaMa1pMeaNGeVKd4XihKat0QTAkKfGQ9nLpnAZ&s=10'
        }
      })
    })
    console.log(response.data);
}




sendMediaMessage();
