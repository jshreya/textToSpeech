let DOMParser = require('xmldom').DOMParser;
let fs = require('fs');

const reportsLocation = 'Reports/';
const reports = ['11900142.xml', '11902796.xml', '11905814.xml', '11905880.xml', '11908298.xml'];
const concatenatedReportsFile = 'concatenatedReports.txt';
const acronymMapFile = 'acronymMap.json';


let tickerMap = new Map();
let acronymMap;

let parsedReportTexts = [];
let summarizedReportTexts = [];
let concatenateReportText;

let parseReport = function(reportName) {
  let parsedReport = '';
  let xmlReport1 = fs.readFileSync(reportsLocation + reportName, 'utf8', function (err, data) {
    if (err) console.log(err);
    else {
      return data;
    }
  });

  let report = new DOMParser().parseFromString(xmlReport1, 'text/xml');
  let htmlMetaDataElements = report.getElementsByTagName('HtmlMetadata');
  let htmlMetaData = htmlMetaDataElements.item(0);

  let reportTitle = htmlMetaData.getAttribute('Title');
  let reportSubtitle = htmlMetaData.getAttribute('Subtitle');

  parsedReport = reportTitle + ': ' + reportSubtitle + '.';

  // console.info(reportTitle);
  // console.info(reportSubtitle);

  let companyName = htmlMetaData.getElementsByTagName('Instrument').item(0).getAttribute('DisplayName');
  let shortName = htmlMetaData.getElementsByTagName('Instrument').item(0).getAttribute('Name');
  let ticker = htmlMetaData.getElementsByTagName('Instrument').item(0).getAttribute('Ticker');

  tickerMap.set(ticker, shortName);

  // console.info(companyName);
  // console.info(shortName);
  // console.info(ticker);

  let price = htmlMetaData.getElementsByTagName('Price').item(0);

  let rating = price.getAttribute('Rating');
  let actualPrice = price.getElementsByTagName('Actual').item(0).childNodes[0].nodeValue;
  let priceObjective = price.getElementsByTagName('Objective').item(0).childNodes[0].nodeValue;
  let currency = price.getElementsByTagName('MeasureCurrency').item(1).getAttribute('IsoCode');

  let upside = ((Number(priceObjective) - Number(actualPrice)) / Number(actualPrice) * 100).toFixed(2) + '%';
  // console.log("upside: " + upside);

  parsedReport = parsedReport + ' We reiterate ' + rating + ' rating, with a price objective of ' + priceObjective + ' ' + currency
  + ' and an upside of ' + upside + ' for ' + companyName + '.';

  // console.info(rating);
  // console.info(priceObjective);
  // console.info(currency);

  let summaryElements = report.getElementsByTagName('Summary');

  let summaryPoints = summaryElements.item(0).getElementsByTagName('li');

  let reportSummary = '';

  for(let i = 0; i < summaryPoints.length; i++) {
    reportSummary = reportSummary + ' ' + summaryPoints.item(i).childNodes[0].nodeValue;
    if(reportSummary.charAt(reportSummary.length - 1) != '.') {
        reportSummary = reportSummary + '.';
    }
  }
  parsedReport = parsedReport + reportSummary + ' ';

  //console.info(parsedReport);
  return parsedReport;
};

let initializeAcronymMap = function() {
  let jsonStr = fs.readFileSync(acronymMapFile, 'utf8', function (err, data) {
    if (err) console.log(err);
    else {
      return data;
    }
  });
  return new Map(JSON.parse(jsonStr));
}

let removeAcronyms = function(reportText) {

  let regexStr;
  for(const [ticker, name] of tickerMap.entries()) {
    regexStr = '\\b' + ticker + '\\b';
    reportText = reportText.replace(new RegExp(regexStr, 'g'), name);
  }

  for(const [acronym, fullWord] of acronymMap.entries()) {
    if(acronym.charAt(acronym.length - 1) == '.') {
      regexStr = '\\b' + acronym;
    } else {
      regexStr = '\\b' + acronym + '\\b';
    }
    reportText = reportText.replace(new RegExp(regexStr, 'g'), fullWord);
  }
  //console.log(reportText);

  return reportText;
};

let getTodaysDate = function() {
  let today = new Date();
  let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'};
  return today.toLocaleDateString('en-US', options);
}

let concatenateReportTexts = function(reportTexts, concatenatedReportsFile) {

  let concatenatedReportText = 'Welcome to the Reasearch Podcast for ' + getTodaysDate() + '. The summaries for today\'s top 5 reports are as follows. ';
  reportTexts.forEach(function(report) {
    concatenatedReportText = concatenatedReportText + report;
  });
  concatenatedReportText = concatenatedReportText + ' This concludes today\'s Reasearch Podcast. Thank you for listening!';
  console.log(concatenatedReportText);

  fs.writeFile(concatenatedReportsFile, concatenatedReportText, function(err) {
    if(err) {
      console.log(err);
    } else {
      console.log(concatenatedReportsFile + ' saved successfully!');
    }
  });

};

// Add acronym to fullWord mappings from acronymMap.json
acronymMap = initializeAcronymMap();

// Parse 5 reports, extract summary and key takeaways
reports.forEach(function(report) {
  parsedReportTexts.push(parseReport(report));
});

// Remove acronyms from parsed reports
parsedReportTexts.forEach(function(parsedReportText) {
  summarizedReportTexts.push(removeAcronyms(parsedReportText));
});

// Concatenate the report texts and save to file
concatenateReportTexts(summarizedReportTexts, concatenatedReportsFile);
