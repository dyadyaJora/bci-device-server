import numpy as np
import seaborn as sns
import pandas as pd
from scipy.stats import pearsonr
import matplotlib.pyplot as plt

totalDf = pd.read_csv('tmp.csv', sep=',', header=0)
data = totalDf.drop(['Gr_ug'], axis=1)


# data = totalDf[totalDf['id'] == '4Ф4К10А_1']
# data = totalDf.sort_values(by=['Gr_ug'])
labels = data['type'].tolist()
data = data.drop(['id', 'type'], axis=1)

ax = None
ax = sns.tsplot(ax=ax, data=data.values, err_style="unit_traces")

plt.title('САН(Самочувствие) 01.04-04.04')
plt.show()

data = data.transpose()

corrs = data.corr()

fig = plt.figure()
ax = fig.add_subplot(111)
cax = ax.matshow(corrs,cmap='coolwarm', vmin=-1, vmax=1)
fig.colorbar(cax)
ticks = np.arange(0,len(data.columns),1)

ax.set_xticks(ticks)
plt.xticks(rotation=90)
ax.set_yticks(ticks)
ax.set_xticklabels(labels)
ax.set_yticklabels(labels)
plt.show()

print(corrs)

data1, data2 = [8, 8, 8], [10, 10, 10]
corr, p = pearsonr(data1, data2)
print(corr, p)
