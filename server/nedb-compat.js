// nedb-compat.js — чинит nedb на новых версиях Node.
//
// nedb заброшен с 2016 года и внутри вызывает util.isDate/isArray/isRegExp —
// старые функции Node, объявленные устаревшими ещё в v4. На версии Node,
// что стоит на плате, util.isDate физически отсутствует («is not a
// function»), и падает вообще любое обращение к базе — не только новый код,
// любое database.find/update. Обнаружилось на пустом на вид запросе, но
// причина одна и та же везде: model.js проверяет тип каждого документа
// через util.isDate ещё до того, как посмотреть на сам запрос.
//
// Возвращаем на место то, что просят — до того, как что-либо потребует nedb.
// Импортировать этот файл первой строкой в любом месте, где создаётся
// Datastore: и в index.js, и в разовых скриптах под scripts/.

import util from "util";

if (typeof util.isDate !== "function") util.isDate = (v) => v instanceof Date;
if (typeof util.isRegExp !== "function") util.isRegExp = (v) => v instanceof RegExp;
if (typeof util.isArray !== "function") util.isArray = Array.isArray;
