var scriptProperties = PropertiesService.getScriptProperties();

async function doConnection() {
  console.log("Entrando em doConnection");
  var apiToken =
    "c66e7f364e1bf24c07383bba555f6820a4e8b30f14704e8ee4a9885ba4fa9b136839c032";
  var path = "/api/3/fields?limit=100";
  var url = "https://resilienciahumana.api-us1.com";
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  try {
    var apiUrl = url + path;
    console.log("apiUrl:", apiUrl);
    var apiResponse = await UrlFetchApp.fetch(apiUrl, options);
    var data = JSON.parse(apiResponse.getContentText());
    console.log("Dados retornados em doConnection:", data);
    return data;
  } catch (error) {
    console.log("Erro ao buscar os dados:", error);
    console.log(error.stack);
    return {};
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

async function testConnection(url, apiToken) {
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };
  console.log("url:", url + "/api/3/contacts");
  var response = await UrlFetchApp.fetch(url + "/api/3/contacts", options);
  var data = JSON.parse(response.getContentText());
  console.log(data);
  return response.getResponseCode() === 200;
}

async function fetchData(url, apiToken) {
  var headers = getSheetHeaders();
  var customFields = await getCustomFields(url, apiToken);
  var lists = await getLists(url, apiToken);

  console.log({ headers, customFields, lists });

  return {
    headers,
    customFields,
    lists,
  };
}

function saveData(data) {
  scriptProperties.setProperties(data);
}

function onFormSubmit() {
  // Função para ser chamada quando o formulário for enviado
}

// Funções do backend

async function getContactID(url, apiToken, email) {
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  console.log("url:", url + "/api/3/contacts?email=" + email);

  var response = await UrlFetchApp.fetch(
    url + "/api/3/contacts?email=" + email,
    options
  );
  var contactData = JSON.parse(response.getContentText());

  if (contactData.contacts.length > 0) {
    console.log("ContactData extraindo: " + contactData.contacts[0]);
    return contactData.contacts[0].id;
  } else {
    return null;
  }
}

async function getUtms(apiUrl, apiToken, contactID) {
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  try {
    console.log("url:", apiUrl + "/api/3/contacts/" + contactID);

    var response = await UrlFetchApp.fetch(
      apiUrl + "/api/3/contacts/" + contactID,
      options
    );
    var contactData = JSON.parse(response.getContentText());
    console.log("Dados do contato retornados em getUtms:", contactData);

    var savedUtms = scriptProperties.getProperties();
    var utmKeys = Object.keys(savedUtms).filter(function (key) {
      return key.startsWith("utm_");
    });

    var utms = utmKeys.map(function (utmKey) {
      var fieldId = savedUtms[utmKey];
      var fieldValue = contactData.contact.fieldValues.find(function (
        fieldValue
      ) {
        return fieldValue.field == fieldId;
      });

      return {
        fieldName: utmKey,
        fieldValue: fieldValue ? fieldValue.value : "",
      };
    });

    console.log("UTMs extraídas:", utms);
    return utms;
  } catch (error) {
    console.log("Erro ao buscar os UTMs:", error);
    return [];
  }
}

function getColumnIndex(columnName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(columnName) + 1;
}

function populateUtms() {
  // Preencher as colunas UTM na planilha
}

function getSheetHeaders() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

async function getCustomFields(apiUrl, apiToken) {
  console.log("Entrando em getCustomFields");
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  try {
    console.log("url:", apiUrl + "/api/3/accountCustomFieldMeta?limit=100");

    var response = await UrlFetchApp.fetch(
      apiUrl + "/api/3/accountCustomFieldMeta?limit=100",
      options
    );
    var fieldsData = JSON.parse(response.getContentText());
    console.log("Dados retornados em getCustomFields:", fieldsData);
    return fieldsData.fields || fieldsData.accountCustomFieldMeta;
  } catch (error) {
    console.log("Erro ao buscar os campos personalizados:", error);
    return [];
  }
}

async function getLists(apiUrl, apiToken) {
  console.log("Entrando em getLists");
  var options = {
    method: "GET",
    mode: "no-cors",
    headers: {
      "Api-Token": apiToken,
    },
  };

  try {
    console.log("url:", apiUrl + "/api/3/lists?limit=100");

    var response = await UrlFetchApp.fetch(
      apiUrl + "/api/3/lists?limit=100",
      options
    );

    var listsData = JSON.parse(response.getContentText());
    console.log("Dados retornados em getLists:", listsData);
    return listsData.lists;
  } catch (error) {
    console.log("Erro ao buscar as listas:", error);
    return [];
  }
}

function createUtmsColumns() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var headers = [
    "utm_campaign",
    "utm_source",
    "utm_medium",
    "utm_content",
    "utm_term",
  ];

  headers.forEach(function (header) {
    console.log("Criando coluna:", header);
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
  });
}

function onInstall() {
  createUtmsColumns();
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
