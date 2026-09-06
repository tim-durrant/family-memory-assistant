export const developmentFixture = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "synthetic-waba",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "+15550000001", phone_number_id: "synthetic-phone" },
            contacts: [{ profile: { name: "Synthetic Daughter" }, wa_id: "15550000002" }],
            messages: [
              {
                from: "15550000002",
                id: "wamid.synthetic-development",
                timestamp: "1735689600",
                text: { body: "This is a synthetic development message." },
                type: "text",
              },
            ],
          },
        },
      ],
    },
  ],
};
