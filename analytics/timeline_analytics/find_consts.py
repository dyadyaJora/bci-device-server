import pandas as pd
from scipy.stats import ttest_ind, ttest_rel
import math
import matplotlib.pyplot as plt
import numpy as np

totalDf = pd.read_csv('Люшер_performance_delta.csv', sep=',', header=0)

results = []

data = totalDf[totalDf['delta1'] == 0]
data = data[data['delta2'] == 0]


print(len(data) / 64)