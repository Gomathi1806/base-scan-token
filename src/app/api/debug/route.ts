import { NextResponse } from "next/server";

/**
 * DEBUG v2 — Tests the 3 failing endpoints
 * Visit: http://localhost:3000/api/debug
 */
export async function GET() {
    const apiKey = process.env.BASESCAN_API_KEY;
    const addr = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // USDC on Base
    const BASE = "https://api.etherscan.io/v2/api?chainid=8453";

    const debug: Record<string, any> = {
        api_key_exists: !!apiKey,
    };

    // TEST 1: Token transfers via token module (current approach)
    try {
        const url = `${BASE}&module=token&action=tokentx&contractaddress=${addr}&page=1&offset=5&sort=desc&apikey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        debug.test1_token_tokentx = {
            status: data.status,
            message: data.message,
            is_array: Array.isArray(data.result),
            count: Array.isArray(data.result) ? data.result.length : "not array",
            raw_result_preview: typeof data.result === "string" ? data.result.slice(0, 200) : undefined,
            sample: Array.isArray(data.result) && data.result[0]
                ? { from: data.result[0].from?.slice(0, 10), to: data.result[0].to?.slice(0, 10), timeStamp: data.result[0].timeStamp }
                : undefined,
        };
    } catch (e) {
        debug.test1_error = String(e);
    }

    // TEST 2: Token transfers via account module (alternative)
    try {
        const url = `${BASE}&module=account&action=tokentx&contractaddress=${addr}&page=1&offset=5&sort=desc&apikey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        debug.test2_account_tokentx = {
            status: data.status,
            message: data.message,
            is_array: Array.isArray(data.result),
            count: Array.isArray(data.result) ? data.result.length : "not array",
            raw_result_preview: typeof data.result === "string" ? data.result.slice(0, 200) : undefined,
            sample: Array.isArray(data.result) && data.result[0]
                ? { from: data.result[0].from?.slice(0, 10), to: data.result[0].to?.slice(0, 10), timeStamp: data.result[0].timeStamp }
                : undefined,
        };
    } catch (e) {
        debug.test2_error = String(e);
    }

    // TEST 3: Contract creation
    try {
        const url = `${BASE}&module=contract&action=getcontractcreation&contractaddresses=${addr}&apikey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        debug.test3_contract_creation = {
            status: data.status,
            message: data.message,
            is_array: Array.isArray(data.result),
            raw_result_preview: typeof data.result === "string" ? data.result.slice(0, 200) : undefined,
            sample: Array.isArray(data.result) && data.result[0] ? data.result[0] : undefined,
        };
    } catch (e) {
        debug.test3_error = String(e);
    }

    // TEST 4: Normal txlist for the contract (another way to check activity)
    try {
        const url = `${BASE}&module=account&action=txlist&address=${addr}&page=1&offset=5&sort=desc&apikey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        debug.test4_account_txlist = {
            status: data.status,
            message: data.message,
            is_array: Array.isArray(data.result),
            count: Array.isArray(data.result) ? data.result.length : "not array",
            raw_result_preview: typeof data.result === "string" ? data.result.slice(0, 200) : undefined,
            sample: Array.isArray(data.result) && data.result[0]
                ? { from: data.result[0].from?.slice(0, 10), to: data.result[0].to?.slice(0, 10), timeStamp: data.result[0].timeStamp }
                : undefined,
        };
    } catch (e) {
        debug.test4_error = String(e);
    }

    return NextResponse.json(debug, { status: 200 });
}


