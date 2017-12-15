var rp = require('request-promise')
var qs = require('querystring')

/**
* Execute VKAPI method
* @param {String} method - Method that will be executed
* @param {Object} parameters - Method parameters
* @param {String} [token] - VK access_token
* @return {Object} response
*/
module.exports = async function (method, parameters, token) {
  parameters.access_token = token
  var resp = await rp(`https://api.vk.com/method/${method}?${qs.stringify(parameters)}&v=5.69`)
  var respjson = JSON.parse(resp)
  if (respjson.error) {
    throw new Error(`VKAPI error #${respjson.error.error_code}: ${respjson.error.error_msg}`)
  } else {
    return respjson.response
  }
}
