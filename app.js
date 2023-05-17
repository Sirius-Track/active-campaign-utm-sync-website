function getContactId(apiUrl, apiToken, email) {
  var options = {
    method: "GET",
    headers: {
      "Api-Token": apiToken,
    },
  };

  var response = UrlFetchApp.fetch(
    apiUrl + "/api/3/contacts?email=" + email,
    options
  );
  var json = JSON.parse(response.getContentText());

  if (json.contacts && json.contacts.length > 0) {
    return json.contacts[0].id;
  } else {
    return null;
  }
}

function getCustomFieldValues(apiUrl, apiToken, contactId) {
  var options = {
    method: "GET",
    headers: {
      "Api-Token": apiToken,
    },
  };

  var response = UrlFetchApp.fetch(
    apiUrl + "/api/3/contacts/" + contactId + "/fieldValues",
    options
  );
  var json = JSON.parse(response.getContentText());

  if (json.fieldValues && json.fieldValues.length > 0) {
    return json.fieldValues;
  } else {
    throw new Error("No custom fields found for contact id " + contactId);
  }
}

function getSheetColumnValues(fieldValues) {
  var scriptProperties = PropertiesService.getScriptProperties();
  try {
    var savedFields = scriptProperties.getProperties();
    var customColumnKeys = Object.keys(savedFields).filter(function (key) {
      return /utm|data/gi.test(key);
    });

    var customColuns = customColumnKeys.map(function (customColumnKey) {
      var fieldId = savedFields[customColumnKey];
      var fieldValue = fieldValues.find(function (fieldValue) {
        return fieldValue.field === fieldId;
      });

      return {
        fieldName: customColumnKey,
        fieldValue: fieldValue ? fieldValue.value : "",
      };
    });

    return customColuns;
  } catch (error) {
    console.log("Erro ao buscar os UTMs:", error);
    return [];
  }
}

function getActiveCampaignData() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var apiUrl = scriptProperties.getProperty("url");
  var apiToken = scriptProperties.getProperty("apiToken");
  var emailColumn = scriptProperties.getProperty("emailColumn");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var data = sheet.getDataRange().getValues().slice(1);
  var headers = getSheetHeaders();

  for (var i = 0; i < data.length; i++) {
    var email = data[i][emailColumn];
    var contactId = getContactId(apiUrl, apiToken, email);
    if (!contactId) continue;
    var customFields = getCustomFieldValues(apiUrl, apiToken, contactId);

    var customColumnFieldValues = getSheetColumnValues(customFields);

    customColumnFieldValues.forEach(function (customColumnFieldValue) {
      var columnIndex = headers.indexOf(customColumnFieldValue.fieldName);
      var columnValue = customColumnFieldValue.fieldValue;

      if (columnIndex > -1)
        sheet.getRange(i + 2, columnIndex + 1).setValue(columnValue);
    });
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("ActiveCampaign Sync")
    .addItem("Configurar", "showModal")
    .addToUi();
}

function showModal() {
  var htmlOutput = HtmlService.createHtmlOutputFromFile("modal.html")
    .setWidth(400)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(
    htmlOutput,
    "Configurar ActiveCampaign"
  );
}

function testConnection(url, apiToken) {
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };
  var response = UrlFetchApp.fetch(url + "/api/3/contacts", options);
  return response.getResponseCode() === 200;
}

async function fetchData(url, apiToken) {
  var headers = getSheetHeaders();
  var customFields = await getCustomFields(url, apiToken);
  var lists = await getLists(url, apiToken);

  return {
    headers,
    customFields,
    lists,
  };
}

function onFormSubmit() {
  // Função para ser chamada quando o formulário for enviado
}

function getSheetHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function getCustomFields(apiUrl, apiToken) {
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  try {
    var response = UrlFetchApp.fetch(
      apiUrl + "/api/3/fields?limit=100",
      options
    );
    var fieldsData = JSON.parse(response.getContentText());
    return fieldsData.fields;
  } catch (error) {
    console.log("Erro ao buscar os campos personalizados:", error);
    return [];
  }
}

function getLists(apiUrl, apiToken) {
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  try {
    var response = UrlFetchApp.fetch(
      apiUrl + "/api/3/lists?limit=100",
      options
    );

    var listsData = JSON.parse(response.getContentText());
    return listsData.lists;
  } catch (error) {
    console.log("Erro ao buscar as listas:", error);
    return [];
  }
}

function createCustomColumns() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_content",
    "utm_term",
    "data_criacao",
  ];

  headers.forEach(function (header) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
  });
}

function onInstall() {
  createCustomColumns();
  onOpen();
}

function setTrigger() {
  ScriptApp.newTrigger("onFormSubmit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onFormSubmit()
    .create();
}

function finalizeMapping(formData) {
  var scriptProperties = PropertiesService.getScriptProperties();

  scriptProperties.setProperty("url", formData.url);
  scriptProperties.setProperty("apiToken", formData.apiToken);
  scriptProperties.setProperty("leadList", formData.leadList);
  scriptProperties.setProperty("emailColumn", formData.emailColumn);
  scriptProperties.setProperty("data_criacao", formData.data_criacao);

  var utmFields = [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_content",
    "utm_term",
  ];

  utmFields.forEach(function (utmField) {
    scriptProperties.setProperty(utmField, formData[utmField]);
  });

  setTrigger();

  var htmlOutput = HtmlService.createHtmlOutput(
    "<p>Configuração concluída com sucesso.</p>"
  )
    .setWidth(300)
    .setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Concluído");
}

function getProperties() {
  var scriptProperties = PropertiesService.getScriptProperties();
  console.log(scriptProperties.getProperties());
}

function onEdit(e) {
  if (e.changeType === "INSERT_ROW") {
    var headers = getSheetHeaders();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var scriptProperties = PropertiesService.getScriptProperties();
    var emailColumn = scriptProperties.getProperty("emailColumn");

    var lastRow = sheet.getLastRow();
    var rows = sheet.getDataRange().getValues();
    var email = rows[rows.length - 1][emailColumn];

    var apiUrl = scriptProperties.getProperty("url");
    var apiToken = scriptProperties.getProperty("apiToken");

    var contactId = getContactId(apiUrl, apiToken, email);
    if (!contactId) return;
    var customFields = getCustomFieldValues(apiUrl, apiToken, contactId);
    var customColumnFieldValues = getSheetColumnValues(customFields);

    customColumnFieldValues.forEach(function (customColumnFieldValue) {
      var columnIndex = headers.indexOf(customColumnFieldValue.fieldName);
      var columnValue = customColumnFieldValue.fieldValue;

      if (columnIndex > -1)
        sheet.getRange(lastRow, columnIndex + 1).setValue(columnValue);
    });
  }
}
