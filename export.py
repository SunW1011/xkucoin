import json
import os

cookiesFolder = r'E:\AIRDROP\SCRIPT\RUN\COOKIES'
output = 'output.txt'

with open('orderbyName.txt', 'r', encoding='utf-8') as f:
    order_list = [line.strip() for line in f.readlines()]

cookiesSaveTemp = {}
failedFiles = []

#read
for cookiesFile in os.listdir(cookiesFolder):
    if cookiesFile.endswith('.json'):
        file_path = os.path.join(cookiesFolder, cookiesFile)
        try:
            with open(file_path, 'r', encoding='utf-8') as json_file:
                cookies = json.load(json_file)
                for cookie in cookies:
                    if cookie.get('name') == 'x_g_t_k':
                        cookiesSaveTemp[cookiesFile] = cookie['value']
                        break
        except (json.JSONDecodeError, FileNotFoundError):
            failedFiles.append(cookiesFile)
#test
#print("Cookies đọc được:", cookiesSaveTemp)

# Order cookies from orderbyName
cookiesOrder = []
countNotFound = 0

for name in order_list:
    found = False
    for cookiesFile in cookiesSaveTemp.keys():
        if name in cookiesFile:
            cookiesOrder.append((name.strip(), f"x_g_t_k={cookiesSaveTemp[cookiesFile].strip()}"))
            found = True
            break
    if not found:
        countNotFound += 1

with open(output, 'w', encoding='utf-8') as file:
    for index, (name, cookie_value) in enumerate(cookiesOrder):
        file.write(f"#{index} {name}\n")
        file.write(f"{cookie_value.strip()}\n")

# check
# print(f"Tổng files cookies đọc được: {len(cookiesSaveTemp)}")
# print(f"Tổng sl cookies không có list: {countNotFound}")
# print(f"Tổng file lỗi: {failedFiles}")
print(f"Finished!!! {output}")