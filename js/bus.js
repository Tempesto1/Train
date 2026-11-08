// Простейшая шина событий, чтобы модули не импортировали друг друга по кругу.
const handlers={};
export function on(name,fn){(handlers[name]=handlers[name]||[]).push(fn)}
export function emit(name,...args){(handlers[name]||[]).forEach(fn=>fn(...args))}
