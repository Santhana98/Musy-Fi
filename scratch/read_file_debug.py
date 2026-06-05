import codecs
with codecs.open('scratch/invidious_html.txt', 'r', 'utf-16') as f:
    print(repr(f.read()))
