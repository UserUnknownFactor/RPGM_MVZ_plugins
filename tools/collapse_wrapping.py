# -*- coding: utf-8 -*-
# This script collapses multi-line messages in RPGM MV games into single liners
# for ease of translating (it also merges any followup empty 401's).
import sys, os, glob, re, json

DEBUG = False
BACKUP = False
END_PUNCTUATION_EN = list(".!?;")
END_PUNCTUATION_JP = list("。！？")
LINES_PER_MESSAGE_WINDOW = 4
PAD_CHARACTER = '\u3000'
IGNORE_FIRST_LINE = r'^\s*[\\「【（・]' #[^\n]{,15}|

def search_data_files(path, name):
    files = glob.glob(os.path.join(path, "**", name), recursive = True)
    return files if len(files) else []

def make401(text, indent=0):
    return {"code":401,"indent":indent,"parameters":[text]}

def parse_rpgmmv_list(old_list):
    z = 0
    is_any_modified = False
    found_quote = False
    while z < len(old_list):
        if 'parameters' not in old_list[z] or len(old_list[z]['parameters']) > 1:
            z += 1
            continue # unknown stuff
        i = 0
        is_modified = False
        text = ''
        while i < LINES_PER_MESSAGE_WINDOW and old_list[z+i]['code'] in (401,):
            tmp = old_list[z+i]['parameters']
            if not tmp or len(tmp) != 1:
                break
            tmp = old_list[z+i]['parameters'][0]
            if not tmp:
                i += 1
                continue
            if i > 0 and re.search(IGNORE_FIRST_LINE, tmp):
                break
            if tmp[-1] in END_PUNCTUATION_JP:
                break
            tmp = tmp.rstrip(' ').rstrip(PAD_CHARACTER).rstrip('\r\n').rstrip('\n').lstrip(' ').lstrip(PAD_CHARACTER)
            if not tmp:
                break
            if tmp[-1] in ["…"]:
                tmp += PAD_CHARACTER
            text += tmp
            i += 1
        if i > 1:
            indent = old_list[z]['indent']
            for _ in range(i):
                old_list.pop(z)
            old_list.insert(z, make401(text, indent))
            is_modified = True
        z += 1

        is_any_modified |= is_modified

    return is_any_modified

def main():
    json_fn = search_data_files(os.path.join(os.getcwd(), 'www\data'), '*.json')
    for jsonf in json_fn:
        is_modified = False
        with open(jsonf, 'r', encoding='utf-8-sig') as f:
            jsonob = json.load(f)
            if 'Map' in jsonf:
                if 'events' not in jsonob: continue
                for event in jsonob['events']:
                    if not event: continue
                    for page in event['pages']:
                        if not page or 'list' not in page: continue
                        is_modified |= parse_rpgmmv_list(page['list'])
            elif 'CommonEvents' in jsonf:
                for page in jsonob:
                    if not page or 'list' not in page: continue
                    is_modified |= parse_rpgmmv_list(page['list'])

        if not DEBUG and is_modified:
            print('Fixing string length of', os.path.basename(jsonf) + '...')
            if BACKUP:
                bakname = jsonf.replace('.json', '.old')
                if not os.path.exists(bakname): os.rename(jsonf, bakname)
            with open(jsonf, 'w', encoding='utf-8-sig') as f:
                f.write(json.dumps(jsonob, ensure_ascii=False))

main()