import pandas as pd
from scipy.stats import ttest_ind, ttest_rel
import math
import matplotlib.pyplot as plt
import numpy as np

totalDf = pd.read_csv('Люшер_fatigue_.csv', sep=',', header=0)

results = []

for i in range(0,12):
    data = totalDf[totalDf['Gr_ug'] == i + 1]

    data1 = data['before'].tolist()
    data2 = data['in'].tolist()
    data3 = data['after'].tolist()

    row = []

    stat, p = ttest_rel(data2, data3)
    print(stat, p)
    if math.isnan(p):
        p = 0
    row.append(p)

    results.append(row)

with open('ttest.csv', 'w') as f:
    for r in results:
        f.write(",".join(list(map(str, r))))
        f.write("\n")


fig = plt.figure()
ax = fig.add_subplot(111)
cax = ax.matshow(results,cmap='binary', vmin=0, vmax=1)
fig.colorbar(cax)
ticks = np.arange(0,len(results),1)
ticks_labels = np.arange(1,len(results) + 1,1)
ax.set_xticks(np.arange(1))
plt.xticks(rotation=90)
ax.set_yticks(ticks)
ax.set_xticklabels(np.arange(1))
ax.set_yticklabels(ticks_labels)

plt.show()

print(results)