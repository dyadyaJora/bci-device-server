import numpy as np
import pandas as pd

from matplotlib import pyplot as plt
from scipy.cluster.hierarchy import dendrogram
from sklearn.datasets import load_iris
from sklearn.cluster import AgglomerativeClustering


def plot_dendrogram(model, **kwargs):
    counts = np.zeros(model.children_.shape[0])
    n_samples = len(model.labels_)
    for i, merge in enumerate(model.children_):
        current_count = 0
        for child_idx in merge:
            if child_idx < n_samples:
                current_count += 1  # leaf node
            else:
                current_count += counts[child_idx - n_samples]
        counts[i] = current_count

    linkage_matrix = np.column_stack([model.children_, model.distances_,
                                      counts]).astype(float)

    dendrogram(linkage_matrix, **kwargs)


timeSeries = pd.DataFrame()
totalDf = pd.read_csv('fatigue.csv', sep=',', header=0)
X = totalDf.drop(['V5_sit_type','V5_real_type','id'], axis=1)
labels = totalDf['V5_real_type'].tolist()

model = AgglomerativeClustering(distance_threshold=0, n_clusters=None, linkage='ward')

model = model.fit(X)
plt.title('Агломеративная кластеризация паттернов ФС (в сравнении с типом личности)')
plot_dendrogram(model, truncate_mode='level', labels=labels)
plt.xlabel("Number of points in node (or index of point if no parenthesis).")
plt.show()