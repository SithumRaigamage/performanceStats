# Licensing

System Monitor uses offline licence keys signed with Ed25519. The app contains only the
**public** key, so it can check a key without internet, but nobody can make new keys
without your **private** key.

| File | Commit it? |
|---|---|
| `generate-keypair.mjs`, `issue-license.mjs`, this README | Yes |
| `keys/private.pem` | **Never.** Back it up somewhere safe (password manager or an encrypted USB drive). If you lose it you can't issue keys for existing versions. If it leaks, anyone can make keys. |
| `keys/issued.csv` | No (customer data). It's your record of every key sold. |
| `../backend/src/license-public-key.js` | Yes (public key) |

## Selling a licence

1. The customer pays on your website (for example through PayHere).
2. Issue their key:
   ```bash
   node licensing/issue-license.mjs --name "Kamal Perera" --email kamal@example.com --order PH-12345
   ```
3. Email them the key printed in the terminal, with the download link.
4. They paste it into **System Monitor → License → Activate**.

## Notes
- Keys don't expire and work on any machine. For a one-time purchase that's normal.
  The licence terms (`../../LICENSE`) say how many computers one licence covers.
- Never re-run `generate-keypair.mjs --force` after you've sold keys: it invalidates all of them.
- Any desktop app can be cracked by someone determined. Offline keys stop casual sharing,
  which is the realistic goal for a one-time-purchase app.
