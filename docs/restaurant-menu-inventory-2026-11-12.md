# All-cities menu photo and review inventory

Counted 2026-11-12 from the **local** database through `/api/admin/restaurant-content` and `/api/admin/restaurant-specials` (enabled records only). Read-only; nothing was changed.

Counting rules:
- An item is counted once per record and menu label.
- "photo" means the item has `image` or `images`; "review" means it has at least one `reviews` entry.
- Ordinary menus are grouped by their guide tile's region. "(no tile region)" are menu-only profiles without a tile.
- A specials menu overrides an ordinary menu with the same label, so some items are counted in both. Treat totals as an upper bound on distinct items.
- Production was not checked, and local numeric IDs may differ from production.

```
region                        items  photo    %  review    %  venues  spec.v
sapporo                        7554    368    4       0    0      74      35
tokyo                          7107    657    9       0    0      77      41
nagoya                         4987    195    3       0    0      79      34
osaka                          4805    125    2       0    0      77      32
fukuoka                        4515    193    4       0    0      68      39
san-diego                      4379   1374   31      79    1       6     280
beijing                        1797    257   14       0    0      37      35
shanghai                       1659    328   19       0    0      50      37
(no tile region)               1656    221   13      14    0      53       0
kyoto                          1321     15    1       0    0      75      35
hangzhou                       1122    148   13       0    0      37      22
phoenix                        1080    156   14       3    0       8      59
shenzhen                       1063     13    1       0    0      41      15
miami                          1026    172   16       1    0       4      93
philadelphia                    871     93   10       3    0       6      60
guangzhou                       823     54    6       0    0      36      11
chicago                         815     82   10       7    0       5      63
dallas                          744     83   11       0    0       6      61
suzhou                          738     44    5       0    0      36       8
seattle                         729     67    9       5    0       4      56
new-york                        700    105   15       1    0       6      66
houston                         681    100   14       1    0       6      60
los-angeles                     671     89   13       9    1       5      57
austin                          613     49    7       5    0       6      58
nanjing                         609     32    5       0    0      36       3
qingdao                         581      0    0       0    0      37       2
tianjin                         578      9    1       0    0      35       3
wuhan                           537     16    2       0    0      37       3
xian                            534      0    0       0    0      36       1
busan                           530      0    0       0    0      53      10
zhengzhou                       503      0    0       0    0      36       0
harbin                          497      0    0       0    0      37       3
chengdu                         492      0    0       0    0      37       2
dalian                          480      0    0       0    0      35       2
chongqing                       479      0    0       0    0      36       1
hefei                           479      0    0       0    0      38       1
shenyang                        475      0    0       0    0      36       2
changsha                        472      0    0       0    0      36       1
ningbo                          464      0    0       0    0      37       2
san-jose                        441     13    2       1    0       6      34
sanya                           435      0    0       0    0      36       1
jinan                           434      0    0       0    0      36       3
dongguan                        424      0    0       0    0      36       1
foshan                          423      0    0       0    0      36       0
kunming                         417      0    0       0    0      36       1
xiamen                          411      0    0       0    0      35       1
haikou                          396      0    0       0    0      35       0
seoul                           364      1    0       0    0      56       6
columbus                        309     13    4       0    0       7      44
boston                          266      0    0       0    0       3      24
washington-dc                   266      0    0       0    0       6       2
san-antonio                     258      0    0       0    0       5      23
jacksonville                    256     13    5       0    0       5      21
charlotte                       241      0    0       0    0       4      12
nashville                       232      0    0       0    0       8       1
atlanta                         220      0    0       0    0       7       1
fort-worth                      207      0    0       0    0       4      29
rome                            201      0    0       0    0       3       0
madrid                          195      0    0       0    0       3       0
fort-lauderdale                 190      0    0       0    0       3       1
san-francisco                   183      0    0       0    0       8      35
honolulu                        169      0    0       0    0       6       1
edmonton                        143      0    0       0    0       3       0
barcelona                       140      0    0       0    0       4       0
las-vegas                       139      0    0       0    0       4       1
palm-springs                    133      0    0       0    0       4       1
victoria                        126      0    0       0    0       3       0
hamilton                        123      0    0       0    0       3       0
halifax                         122      0    0       0    0       3       0
london                          107      0    0       0    0       3       0
calgary                         105      0    0       0    0       3       0
vienna                          100      0    0       0    0       4       0
melbourne                        89      0    0       0    0       2       0
lisbon                           86      0    0       0    0       3       0
montreal                         83      0    0       0    0       3       0
brisbane                         78      0    0       0    0       3       0
saskatoon                        74      0    0       0    0       3       0
hong-kong                        73      1    1       0    0       5       1
paris                            72      0    0       0    0       4       0
sacramento                       68      0    0       0    0       3       1
vancouver                        61      0    0       0    0       3       0
winnipeg                         59      0    0       0    0       3       0
dublin                           58      0    0       0    0       2       0
sydney                           56      0    0       0    0       2       0
toronto                          54      0    0       0    0       3       0
taichung                         45      0    0       0    0       2       1
taipei                           42      0    0       0    0       5       1
adelaide                         39      0    0       0    0       2       0
monterrey                        39      0    0       0    0       1       0
berlin                           38      0    0       0    0       3       0
amsterdam                        36      0    0       0    0       3       0
ottawa                           34      0    0       0    0       3       0
mexico-city                      32      0    0       0    0       1       0
wellington                       31      0    0       0    0       1       0
quebec-city                      27      0    0       0    0       3       0
kaohsiung                        24      0    0       0    0       5       1
auckland                         22      0    0       0    0       1       0
christchurch                     21      0    0       0    0       1       0
copenhagen                       21      0    0       0    0       3       0
perth                            19      0    0       0    0       1       0
stockholm                         7      0    0       0    0       2       0
orlando                           2      0    0       0    0       1       1
guadalajara                       1      0    0       0    0       1       0
TOTAL 68733 5086 129 1860 1542
```
