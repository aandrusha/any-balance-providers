﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://komandacard.ru/';

var g_headers = {
	'Accept': 'application/json; charset=utf-8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'X-Requested-With': 'XMLHttpRequest',
	'Origin': baseurl.replace(/\/+$/, ''),
	'Referer': baseurl,
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона в формате 9261234567 без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'account/login', g_headers);
	var json = getJson(html);

	var rvt = getParam(json.html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);

	var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl + 'login', "6LejgioUAAAAAK6ZVEm_o8YhLHpnBil1J-hrPQnB");

	html = AnyBalance.requestPost(baseurl + 'account/login', JSON.stringify({
    	"__RequestVerificationToken": rvt,
    	"Captcha": captcha,
    	"Password": prefs.password,
    	"Phone": '+7 ' + prefs.login,
	}), addHeaders({
		RequestVerificationToken: rvt,
		'Content-Type': 'application/json'
	}));

	json = getJson(html);
	
	if(!json.params || json.params.result != 0){
		var error = getElement(json.html, /<div[^>]+validation-summary-errors/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + 'account', addHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}));

	getParam(html, result, 'balance', /Баллов всего:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Баллов доступно:[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_bonus', 'last_place', 'last_status')){
		var row = getElement(html, /<div[^>]+block-statement__content/i);
		row = row && getElement(row, /<div[^>]+block-table__body/i);
		row = row && getElement(row, /<div[^>]+"block-table__row/i);
		getParam(row, result, 'last_date', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		getParam(row, result, 'last_place', /(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(row, result, 'last_sum', /(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(row, result, 'last_status', /(?:[\s\S]*?<div[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(row, result, 'last_bonus', /(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}   
	
	AnyBalance.setResult(result);
}