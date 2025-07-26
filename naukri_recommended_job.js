const { Builder, By, Key, until } = require('selenium-webdriver');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const keywords = ['Angular', 'HTML', 'CSS', '.Net Core', 'UI/UX', 'UI Development', 'JavaScript', 'Frontend', 'TypeScript', 'Node.js', 'Software Developer'];
const excludeKeywords = ["Java", "PHP", "AEM", "AngularJS", "Python"];

const answers = {
    ".Net Core": "4",
    ".Net": "4",
    "Angular": "4",
    "HTML": "4",
    "CSS": "4",
    "Javascript": "4",
    "notice period": "30",
    "ReactJS": "0",
    "First Name": "Kaushal",
    "Last Name": "Shah",
    "Total Experience": "4",
    "Total Number of experiences": "4",
    "Current Location": "Pune",
};


async function takeScreenshot(driver, jobTitle, step) {
    // Define the base screenshot folder
    const safeJobTitle = jobTitle.replace(/[<>:"\/\\|?*]/g, "");
    console.log(safeJobTitle)
    const folderPath = path.join(__dirname, "Screenshot", "Recommend Job", safeJobTitle);
    console.log(folderPath)
        // Create the base folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    // Take the screenshot
    let image = await driver.takeScreenshot();
    let filePath = path.join(folderPath, `${step}.png`);

    // Save the screenshot
    fs.writeFileSync(filePath, image, 'base64');
}

// Excel file setup
const getISTDateTime = () => {
    let now = new Date();
    let istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
    let istTime = new Date(now.getTime() + istOffset);

    return istTime.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
};

let jobData = [];

// Function to save data to Excel
function saveToExcel() {
    // Define the base screenshot folder
    const baseDir = path.join(__dirname, 'Excel Data');

    // Create the base folder if it doesn't exist
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir);
    }

    const filePath = path.join(baseDir, `Job_Applications_${getISTDateTime()}.xlsx`);
    let workbook = xlsx.utils.book_new();
    let worksheet = xlsx.utils.json_to_sheet(jobData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "Jobs");
    xlsx.writeFile(workbook, filePath);
    console.log(`Excel file updated: ${filePath}`);
}

(async function naukriRecommendedJobs() {
    let driver = await new Builder().forBrowser('chrome').build();

    try {
        // Open Naukri
        await driver.get('https://www.naukri.com/');

        // Click on Login Button
        await driver.findElement(By.xpath("//a[text()='Login']")).click();
        await driver.sleep(1000);

        // Enter Credentials
        await driver.findElement(By.xpath('//*[@id="root"]/div[4]/div[2]/div/div/div[2]/div/form/div[2]/input')).sendKeys('kaushalshah750@gmail.com');
        await driver.findElement(By.xpath('//*[@id="root"]/div[4]/div[2]/div/div/div[2]/div/form/div[3]/input')).sendKeys('kaushal$#@#123');
        await driver.findElement(By.className('loginButton')).click();

        console.log('Logged in successfully!');

        // Wait for login to complete
        await driver.sleep(1000);

        // Navigate to job search page
        await driver.get('https://www.naukri.com/mnjuser/recommendedjobs');

        // Wait for job listings to load
        await driver.wait(until.elementLocated(By.className('jobTuple')), 10000);

        // Get job elements
        let jobElements = await driver.findElements(By.className('jobTuple'));

        console.log('Recommended Jobs:');

        for (let job of jobElements) {
            let title = await job.findElement(By.className('title')).getText();
            let company = await job.findElement(By.className('companyInfo')).getText();
            let location = await job.findElement(By.className('location')).getText();
            let experience = await job.findElement(By.className('experience')).getText();
            let description = await job.findElement(By.className('job-description')).getText();
            let type = await job.findElement(By.className('type')).getText();
            let jobLink = "";
            let summary = "";

            let jobMatches = keywords.some(keyword => {
                return title.toLowerCase().includes(keyword.toLowerCase()) || description.toLowerCase().includes(keyword.toLowerCase());
            });

            // Check if the job contains any excluded keyword
            let containsExcludedKeyword = excludeKeywords.some(keyword =>
                title.toLowerCase().includes(keyword.toLowerCase()) || description.toLowerCase().includes(keyword.toLowerCase())
            );

            if (jobMatches && !containsExcludedKeyword) {
                // Open job in a new tab
                await job.click();
                await driver.sleep(1000);

                // Switch to the new tab
                let tabs = await driver.getAllWindowHandles();
                await driver.switchTo().window(tabs[1]);

                await driver.sleep(1000);

                await takeScreenshot(driver, title, 'Job Detail');

                // Capture job link
                jobLink = await driver.getCurrentUrl();

                // Wait for the Apply button to appear on the job page
                let companySiteApplyButton = await driver.findElements(By.id('company-site-button'));
                if (companySiteApplyButton.length > 0) {
                    await takeScreenshot(driver, title, 'Company Site');
                    summary = "Company Site"
                    jobData.push({ title, company, location, experience, type, description, jobLink, summary });
                    console.log(`You have to apply from the Company site for job : ${title}`);
                } else {
                    let applyButton = await driver.wait(until.elementLocated(By.id('apply-button')), 10000);
                    // Click the Apply button
                    await applyButton.click();

                    // Wait for form fields/questions to appear
                    await driver.sleep(1000);

                    console.log(`Attempting to apply to job: ${title}`);
                    await takeScreenshot(driver, title, 'Is Applied');

                    // Check if the apply-message element exists (indicating successful application)
                    let applyMessageElements = await driver.findElements(By.className('apply-message'));
                    let isApplicationComplete = false;


                    if (applyMessageElements.length > 0) {
                        await takeScreenshot(driver, title, 'Applied');
                        // If the apply-message is found, it indicates successful application
                        let messageText = await applyMessageElements[0].getText();
                        if (messageText.includes(`You have successfully applied to '${title}'`)) {
                            console.log(`Successfully applied to job: ${title} without any questions.`);
                            isApplicationComplete = true;
                            summary = "Applied"
                            jobData.push({ title, company, location, experience, type, description, jobLink, summary });
                        }
                    } else {
                        console.log(`Applying to job with questions: ${title}`);
                        // Loop to answer questions until successful application
                        while (!isApplicationComplete) {
                            try {
                                // Find the last question element dynamically
                                let questionElements = await driver.findElements(By.xpath("//div[contains(@class, 'botMsg') and contains(@class, 'msg')]//span"));

                                if (questionElements.length === 0) {
                                    console.log("No more questions found. Checking for application confirmation...");
                                    break;
                                }

                                let lastQuestionElement = questionElements[questionElements.length - 1];
                                let questionText = await lastQuestionElement.getText();

                                let matchedKey = Object.keys(answers).find(key => questionText.toLowerCase().includes(key.toLowerCase()));
                                await takeScreenshot(driver, title, 'Last Question');

                                console.log(`Last Question Found: ${questionText}`);
                                console.log(matchedKey);
                                if (questionText != "Thank you for your responses.") {
                                    if (matchedKey) {
                                        console.log(`Answering: '${matchedKey}' with '${answers[matchedKey]}'`);

                                        let inputField = await driver.findElement(By.xpath("//div[@contenteditable='true']"));
                                        await inputField.sendKeys(answers[matchedKey]);

                                        // Click Save
                                        let saveButton = await driver.findElement(By.className("sendMsg"));
                                        await saveButton.click();
                                        console.log("Answer submitted. Waiting for the next question...");

                                        // Wait for the next question to appear
                                        await driver.sleep(2000); // Wait before checking again

                                        await takeScreenshot(driver, title, 'Next Question');
                                        // Check if a new question appeared
                                        let newQuestionElements = await driver.findElements(By.xpath("//div[contains(@class, 'botMsg') and contains(@class, 'msg')]//span"));

                                        if (newQuestionElements.length > questionElements.length) {
                                            console.log("New question detected. Answering next...");
                                            continue;
                                        }
                                    }
                                }


                                await driver.sleep(2000); // Wait before checking applied message.

                                // If no new question, check for success message
                                let applyMessageElements = await driver.findElements(By.className('apply-message'));
                                // let applyMessageElements = await driver.wait(until.elementLocated(By.className('apply-message')), 10000);
                                await takeScreenshot(driver, title, 'No Question');
                                if (applyMessageElements.length > 0) {
                                    let messageText = await applyMessageElements[0].getText();
                                    if (messageText.includes("successfully applied")) {
                                        console.log("Application successful!");
                                        isApplicationComplete = true;
                                        summary = "Applied"
                                        jobData.push({ title, company, location, experience, type, description, jobLink, summary });

                                    }
                                } else {
                                    isApplicationComplete = true
                                    console.log(`Unable to apply for job: ${title}`);
                                    summary = "Pending"
                                    jobData.push({ title, company, location, experience, type, description, jobLink, summary });
                                }

                            } catch (error) {
                                console.error("Error during question answering:", error);
                                break;
                            }
                        }
                    }

                }

                // Close the job tab and switch back to the main tab
                await driver.close();
                await driver.switchTo().window(tabs[0]);

                // Wait before moving to the next job
                await driver.sleep(2000);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        console.log(jobData)
            // Save to JSON
        fs.writeFileSync(path.join(__dirname, 'jobs.json'), JSON.stringify(jobData, null, 2));
        console.log('Jobs saved to jobs.json');
        saveToExcel(); // Save progress after each job
        await driver.quit();
    }
})();