from scipy.stats import shapiro
from scipy.stats import anderson
import matplotlib.pyplot as plt
import math

import pandas as pd


def get_count(labels):
    counts = {}
    for i in range(0, 12):
        counts[i] = 0
    for i in labels:
        tmp = round(i / 11)
        counts[tmp] += 1

    return counts

totalDf = pd.read_csv('Люшер_fatigue_.csv', sep=',', header=0)
# labels = totalDf['Gr_ug'].tolist()
labels = totalDf['before'].tolist()
labels_in = totalDf['in'].tolist()
labels_after = totalDf['after'].tolist()

plt.figure(figsize=(25, 10))
plt.title('Распределение типов личности в выборке')
plt.xlabel('Тип личности')
plt.ylabel('Количество')

counts = get_count(labels)
counts_in = get_count(labels_in)
counts_after = get_count(labels_after)
plt.bar(counts.keys(), counts.values())
plt.bar(counts_in.keys(), counts_in.values())
plt.bar(counts_after.keys(), counts_after.values())
plt.show()
stats, p = shapiro(labels)
print(stats, p)

