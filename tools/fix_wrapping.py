# -*- coding: utf-8 -*-
# This script merges consequent lines of a single message boxes of RPGM MV game
# and splits them again based on their character lengths.
import sys, os, glob, re, json

DEBUG = False
BACKUP = False
DATA_FOLDER = 'www\\data'

PUNCTUATION_EN = ".,!?;:"
MAXIMAL_LENGTH = 60
MAXIMAL_PX_WIDTH = 800
PAD_CHARACTER = '\u3000'
IGNORE_FIRST_LINE = r'^(?:[\w_-]+$|\\\w(?:\[[^\]]+\])?)$|^\s*[^\u300C].{,'+f'{MAXIMAL_LENGTH-5}'+'}$' #[^\n]{,15}|
REMOVE_MULTI_SPACES = r'(?<=[-=\+…\.,:;!\?\w\d])[ \u3000]{1,2}(?=[\w\d])'
WRAP_TRAILING_WORDS_RE = r'(?:a|the|if|of|in|at|to|on)'
JAPANESE_PUCTUATION = r'[（）＠≪≫◆〜…『』「」【】❤]'
FIRST_QUOTE_CHAR = '「'
LAST_QUOTE_CHAR = '」'

import ctypes # for Windows only
class SIZE(ctypes.Structure):
    _fields_ = [("cx", ctypes.c_long), ("cy", ctypes.c_long)]

class Measure(object):
    def __init__(self, font="MS Gothic", size=24):
        self.MEASURE_FONT = font
        self.MEASURE_SIZE = size
        self.count = 0

    def __enter__(self):
        if self.count == 0:
            self.hdc = ctypes.windll.user32.GetDC(0)
            self.hfont = ctypes.windll.gdi32.CreateFontW(-self.MEASURE_SIZE, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, self.MEASURE_FONT)
            self.hfont_old = ctypes.windll.gdi32.SelectObject(self.hdc, self.hfont)
        self.count += 1
        return self

    def __exit__(self, *args):
        if self.count == 1:
            ctypes.windll.gdi32.SelectObject(self.hdc, self.hfont_old)
            ctypes.windll.gdi32.DeleteObject(self.hfont)
            self.hdc = None
        self.count -= 1

    def width(self, text):
        assert self.hdc is not None
        size = SIZE(0, 0)
        ctypes.windll.gdi32.GetTextExtentPoint32W(self.hdc, text, len(text), ctypes.byref(size))
        return size.cx#, size.cy)

def search_resource(path, name):
    files = glob.glob(os.path.join(path, "**", name), recursive = True)
    return files if len(files) else []

def cut_line_px(text, max_width=MAXIMAL_PX_WIDTH, spacer=' ', outer_m=None):
    tmp_str = ''
    tmp_arr = []
    words = text.split(spacer) if spacer else list(text)
    if spacer is None: spacer = ''
    with (Measure() if outer_m is None else outer_m) as m:
        j = 0
        for i, word in enumerate(words):
            next_text = tmp_str + spacer + word
            is_last = bool(i == len(words) - 1)
            if spacer and m.width(word) > max_width:
                if j > 0:
                    tmp_arr.append(tmp_str)
                tmp_arr += cut_line_px(next_text if j > 0 else word, max_width, spacer=None, outer_m=m)
                tmp_str = tmp_arr.pop()
                if is_last:
                    tmp_arr.append(tmp_str)
                continue
            cur_width = m.width(next_text if j > 0 else word)
            if is_last:
                if cur_width > max_width:
                    if j > 0:
                        tmp_arr.append(tmp_str)
                    tmp_arr.append(word + spacer)
                else:
                    tmp_arr.append(next_text + spacer)
            elif cur_width > max_width or (
                    i < len(words) - 1 and (
                        re.search(WRAP_TRAILING_WORDS_RE, words[i+1])) and (
                        cur_width + m.width(spacer + words[i+1]) > max_width)):
                tmp_arr.append(tmp_str)
                tmp_str = word + spacer
                j = 0
            else:
                tmp_str += spacer + word if j > 0 else word
                j += 1
    return tmp_arr

def cut_line_chars(text, interval=MAXIMAL_LENGTH, mind_chr=' '):
    tmp_str = text
    tmp_str_len = len(tmp_str)
    mnd_chr_len = len(mind_chr)
    tmp_arr = []
    j = 0
    while tmp_str_len > interval:
        where = interval
        if (mind_chr is not None):
            where_rspace = tmp_str[:interval].rfind(mind_chr)
            if where_rspace < 2 or tmp_str[interval-1] in PUNCTUATION_EN:
                where_rspace = interval
            where = min(interval, where_rspace)
            shortend = re.search(WRAP_TRAILING_WORDS_RE, tmp_str[:where])
            if shortend and where > len(shortend[0]) + 6:
                where -= len(shortend[0]) #ignore short words at the end
            tmp = tmp_str[:where]
            if tmp[:mnd_chr_len] == mind_chr:
                tmp = tmp[mnd_chr_len:]
            tmp_arr.append(tmp)
            tmp_str = tmp_str[where:]
            if tmp_str[:mnd_chr_len] == mind_chr:
                tmp_str = tmp_str[mnd_chr_len:]
        else:
            tmp_arr.append(tmp_str[:where])
            tmp_str = tmp_str[where:]
        tmp_str_len = len(tmp_str)
        j += 1

    if len(tmp_arr):
        if len(tmp_str): tmp_arr.append(tmp_str) # add last part to array
        return tmp_arr
    else:
        return [text]

def make401(text, indent=0):
    return {"code":401,"indent":indent,"parameters":[text]}

def parse_list(old_list):
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
        while i < 4 and old_list[z+i]['code'] in (401,):
            if not old_list[z+i]['parameters'][0] or len(old_list[z+i]['parameters']) > 1 or (
                (i == 0 and re.search(IGNORE_FIRST_LINE, old_list[z+i]['parameters'][0]))):
                break
            tmp = old_list[z+i]['parameters'][0]
            found_quote = FIRST_QUOTE_CHAR in tmp[:2]
            text += tmp.rstrip(' ') + ' '
            if len(tmp) > MAXIMAL_LENGTH:
                is_modified = True
            i += 1

        if is_modified:
            indent = old_list[z]['indent']
            for j in range(i):
                old_list.pop(z)
            new_lines = cut_line_px(re.sub(REMOVE_MULTI_SPACES, ' ', text))
            first = True
            if new_lines[-1] == LAST_QUOTE_CHAR:
                new_lines[-2] += LAST_QUOTE_CHAR
                del new_lines[-1]
            for l in new_lines:
                if not first:
                    old_list.insert(z, make401(PAD_CHARACTER + l if found_quote else l, indent))
                else:
                    first = False
                    old_list.insert(z, make401(l, indent))
                z += 1
        else:
            z += 1

        is_any_modified |= is_modified
        found_quote = False

    return is_any_modified

def main():
    json_fn = search_resource(os.path.join(os.getcwd(), DATA_FOLDER), '*.json')
    for jsonf in json_fn:
        is_modified = False
        with open(jsonf, 'r', encoding='utf-8-sig') as f:
            try:
                jsonob = json.load(f)
            except Exception as e:
                print(f"Error parsing file {jsonf}: {e}")
                continue
            if 'Map' in jsonf:
                if 'events' not in jsonob: continue
                for event in jsonob['events']:
                    if not event: continue
                    for page in event['pages']:
                        if not page or 'list' not in page: continue
                        is_modified |= parse_list(page['list'])
            elif 'CommonEvents' in jsonf:
                for page in jsonob:
                    if not page or 'list' not in page: continue
                    is_modified |= parse_list(page['list'])

        if not DEBUG and is_modified:
            print('Fixing string length of', os.path.basename(jsonf) + '...')
            if BACKUP:
                bakname = jsonf.replace('.json', '.old')
                if not os.path.exists(bakname): os.rename(jsonf, bakname)
            with open(jsonf, 'w', encoding='utf-8-sig') as f:
                f.write(json.dumps(jsonob, ensure_ascii=False))

main()