import numpy as np
import seaborn as sns
import pandas as pd
from scipy import stats
import scipy.cluster.hierarchy as hac
import matplotlib.pyplot as plt
from scipy.stats import shapiro
from scipy.stats import anderson


timeSeries = pd.DataFrame()
totalDf = pd.read_csv('fatigue.csv', sep=',', header=0)
fatigue_data = totalDf.drop(['V5_sit_type','V5_real_type','id'], axis=1)
# fatigue_data = fatigue_data.drop_duplicates()
# labels = (totalDf['V5_sit_type'].map(str) + "_"+ totalDf['V5_real_type'].map(str) + "_" + totalDf['id'].map(str)).tolist()
labels = totalDf['V5_real_type'].tolist()
ax = None
ax = sns.tsplot(ax=ax, data=fatigue_data.values, err_style="unit_traces")


plt.figure(figsize=(25, 10))
plt.title('Group type distribution')
plt.xlabel('Group type')
plt.ylabel('count')

counts = {}
for i in range(-1,12):
       counts[i] = 0
for i in labels:
       counts[i] += 1

plt.bar(counts.keys(), counts.values())

stat, p = shapiro(labels)
print(stat, p)

Z = hac.linkage(fatigue_data,  method='complete')


plt.figure(figsize=(25, 10))
plt.title('Агломеративная кластеризация паттернов "Тревожность" (в сравнении с типом личности)')
plt.xlabel('Тип личности')
plt.ylabel('расстояние')
hac.dendrogram(
       Z,
       leaf_rotation=90.,  # rotates the x axis labels
       leaf_font_size=8.,  # font size for the x axis labels
       labels=labels
)
plt.show()
print("x")