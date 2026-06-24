import { extractContractTerms } from './extractContractTerms';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "Loaded" : "Missing");
  try {
    const transcript = "Thương lái đồng ý mua 10 tấn cá tra của nông dân với giá 25000 VND/kg. Giao hàng vào ngày 15/10/2023. Giao tại ao.";
    const terms = await extractContractTerms(transcript);
    console.log("Extracted Terms:", JSON.stringify(terms, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}
main();
