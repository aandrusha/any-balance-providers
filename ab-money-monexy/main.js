﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.monexy.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/client', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var csrf_token = getParam(html, null, null, /var[\s]csrf_token[\s\S]=[\s\S]"([^"]+){1}/i);
    
	html = AnyBalance.requestPost(baseurl + 'ajax/client/checkLogin', {
		login: prefs.login,
		'csrf_token': csrf_token
	}, addHeaders({Referer: baseurl + 'ajax/client/checkLogin'}));
    
    var json = getJson(html);
    
	if (!json.result) {
		var error = json.msg;
		if (error)
			throw new AnyBalance.Error(error, null, /неверный номер телефона/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}    
   
	html = AnyBalance.requestPost(baseurl + 'ajax/client/checkStaticPassword', {
		'staticPassword': prefs.password,
		'csrf_token': csrf_token
	}, addHeaders({Referer: baseurl + 'ajax/client/checkStaticPassword'}));
		
    json = getJson(html);
    
	if (!json.result) {
		var error = json.msg;
		if (error)
			throw new AnyBalance.Error(error, null, /Статический пароль введен неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}    
        
    html = AnyBalance.requestGet(baseurl + 'ru/client', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /totalSum(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', /accPhone(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'vauchers', /Мои ваучеры(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    
    html = AnyBalance.requestGet(baseurl + 'ru/client/profile/limits', g_headers);
    
	getParam(html, result, 'limit', /Остаток,[\s]грн[\s]\*\*(?:[^>]*>){15}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}