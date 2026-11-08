'use client';
import {Children,createContext,cloneElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {translate,type Language} from '../lib/i18n';
export const LanguageContext=createContext<Language>('en');
/** Keep callbacks, refs, numeric values and game-state props untouched. */
export function localizeTree(node:ReactNode,language:Language):ReactNode{
 if(typeof node==='string')return translate(node,language);
 if(Array.isArray(node))return Children.map(node,child=>localizeTree(child,language));
 if(!isValidElement(node))return node;
 const element=node as ReactElement<Record<string,unknown>>,props=element.props,changes:Record<string,unknown>={};
 for(const key of ['aria-label','aria-valuetext','title','placeholder','alt'])if(typeof props[key]==='string')changes[key]=translate(props[key] as string,language);
 if(element.type==='option'&&props.lang)return node;
 if(props.children!==undefined)changes.children=localizeTree(props.children as ReactNode,language);
 // These JSX slots are rendered by the child, but created in the parent.
 for(const key of ['settingsPanel','controlsHelp','notebook'])if(isValidElement(props[key]))changes[key]=localizeTree(props[key] as ReactNode,language);
 return cloneElement(element,changes);
}
