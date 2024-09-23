const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const FormData = require('form-data');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { Worker, isMainThread, workerData } = require('worker_threads');

class KucoinAPIClient {
    constructor(accountIndex = 0) {
        this.headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Origin": "https://www.kucoin.com",
            "Referer": "https://www.kucoin.com/miniapp/tap-game?inviterUserId=1790142439&rcode=QBSLTEH5",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Safari";v="604"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"iOS"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        };
        this.accountIndex = accountIndex;
        this.proxyIP = null;
    }

    static loadProxies() {
        const proxyFile = path.join(__dirname, 'proxy.txt');
        return fs.readFileSync(proxyFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    }

    async log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString().toString().green;
        const accountIndexFormat = (this.accountIndex + 1).toString().padStart(3, '0');
        const accountPrefix = `Tài khoản ${accountIndexFormat.green}`;
        const ipLength = 25;
        const ipPrefix = (this.proxyIP ? `${this.proxyIP.green.padEnd(ipLength, ' ')}` : `Unknown IP`).padEnd(ipLength, ' ');

        let logMessage = `[${timestamp}] [*] ${accountPrefix} [*] ${ipPrefix} [*] ${msg}`;

        switch (type) {
            case 'success':
                console.log(logMessage.green);
                break;
            case 'error':
                console.log(logMessage.red);
                break;
            case 'warning':
                console.log(logMessage.yellow);
                break;
            default:
                console.log(logMessage.white);
        }
    }

    async countdown(seconds) {
        while (seconds > 0) {
            const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const sec = String(seconds % 60).padStart(2, '0');

            process.stdout.write(`[${hours}:${minutes}:${sec.red}]\r`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            seconds -= 1;
        }
    }
    

    generateRandomPoints(totalPoints, numRequests) {
        let points = new Array(numRequests).fill(0);
        let remainingPoints = totalPoints;
        for (let i = 0; i < numRequests - 1; i++) {
            const maxPoint = Math.min(60, remainingPoints - (numRequests - i - 1));
            const point = Math.floor(Math.random() * (maxPoint + 1));
            points[i] = point;
            remainingPoints -= point;
        }

        points[numRequests - 1] = remainingPoints;

        for (let i = points.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [points[i], points[j]] = [points[j], points[i]];
        }

        return points;
    }

    async increaseGold(cookie, increment, molecule, proxyAgent) {
        const url = "https://www.kucoin.com/_api/xkucoin/platform-telebot/game/gold/increase?lang=en_US";

        const formData = new FormData();
        formData.append('increment', increment);
        formData.append('molecule', molecule);
        const headers = {
            ...this.headers,
            "Cookie": cookie,
            ...formData.getHeaders()
        };

        try {
            const response = await axios.post(url, formData, {
                headers,
                httpsAgent: proxyAgent
            });
            if (response.status === 200) {
                return { success: true, data: response.data };
            } else {
                return { success: false, error: `HTTP Error: ${response.status}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://api.ipify.org?format=json', { httpsAgent: proxyAgent });
            if (response.status === 200) {
                return response.data.ip;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    async processAccount(cookie, proxy) {
        const proxyAgent = new HttpsProxyAgent(proxy);

        try {
            this.proxyIP = await this.checkProxyIP(proxy);
        } catch (error) {
            await this.log(`Không thể kiểm tra IP của proxy: ${error.message}`, 'warning');
            return;
        }

        await this.log(`${'Start'.green}`, 'info');

        const points = this.generateRandomPoints(3000, 55);
        let totalPoints = 0;
        let currentMolecule = 3000;

        for (let j = 0; j < points.length; j++) {
            const increment = points[j];
            currentMolecule -= increment;
            const result = await this.increaseGold(cookie, increment, currentMolecule, proxyAgent);
            if (result.success) {
                totalPoints += increment;
        
                const x = result.data.data.toString().green.padStart(15, ' ');
                const y = currentMolecule.toString().red;
        
                await this.log(`Đã hốc được ${x} giun | Còn ${y} giun`, 'info');
            }
             else {
                await this.log(`Lỗi khi hốc: ${result.error}`, 'error');
            }

            await this.countdown(5);
        }

        await this.log(`Tổng points đã tăng: ${totalPoints}`, 'info');
        await this.log(`Tài khoản đã xử lý xong: ${this.accountIndex + 1}`, 'success');
    }
}

async function workerFunction(workerData) {
    const { cookie, proxy, accountIndex } = workerData;
    const client = new KucoinAPIClient(accountIndex);
    await client.processAccount(cookie, proxy);
    parentPort.postMessage('done');
}

async function main() {
    const dataFile = path.join(__dirname, 'data.txt');
    const cookies = fs.readFileSync(dataFile, 'utf8')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

    const proxies = KucoinAPIClient.loadProxies();
    const maxThreads = 10;
    const timeout = 10 * 60 * 1000;

    while (true) {
        for (let i = 0; i < cookies.length; i += maxThreads) {
            const workerPromises = [];

            const remainingAccounts = Math.min(maxThreads, cookies.length - i);

            for (let j = 0; j < remainingAccounts; j++) {
                const cookie = cookies[i + j];
                const proxy = proxies[(i + j) % proxies.length];
                const worker = new Worker(__filename, {
                    workerData: { cookie, proxy, accountIndex: i + j }
                });

                const workerPromise = new Promise((resolve, reject) => {
                    worker.on('message', resolve);
                    worker.on('error', reject);
                    worker.on('exit', (code) => {
                        if (code !== 0) reject(new Error(`Lỗi ${code}`));
                    });
                });

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Luồng hết thời gian xử lý')), timeout)
                );

                workerPromises.push(Promise.race([workerPromise, timeoutPromise]));
            }

            await Promise.allSettled(workerPromises);
            console.log(`===============> Hoàn thành xử lý luồng ${remainingAccounts}. Chuyển sang nhóm tiếp theo... <===============`.red);
        }

        console.log('Đã xử lý xong tất cả. Nghỉ 10 phút...');
        await new Promise(resolve => setTimeout(resolve, 10 * 60 * 1000));
    }
}

if (isMainThread) {
    main().catch(console.error);
} else {
    workerFunction(workerData);
}