/**
 *
 * Load a email into Memory (PREPROD)
 *
 */

import { dirname, join, resolve } from "node:path";
import PostalMime from "postal-mime";

//
// Run
//

const filePath = "/home/nflyr/Downloads/sample_email_1.eml";
const html = await Bun.file(filePath).text();
const email = await PostalMime.parse(html);

console.log("From: ", email.from.name, email.from.address);
console.log("To: ", email.to[0]?.name, email.to[0]?.address);
console.log("Subject: ", email.subject);
console.log("Date: ", email.date);
