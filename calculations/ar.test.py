import sys
import getopt
from matplotlib import pyplot
from pandas.plotting import autocorrelation_plot
import numpy as np
import pandas as pd
import dateutil.parser
from influxdb import InfluxDBClient as influx
from statsmodels.tsa.arima_model import ARIMA
from sklearn.metrics import mean_squared_error

if __name__ == '__main__':
	opts, args = getopt.getopt(sys.argv[1:], 'hn:', ['help', 'sessionId='])
	print(opts, args)

	# if len(args) == 0:
	#     sys.exit()

	# sessionId = args[0]

	sessionId = "2fe617b1-8b98-4a12-bb0d-083b777d00b7"

	client = influx(host='localhost', port=8086)
	data_influx = client.query(
		"SELECT band7 from autogen.band_power_rel WHERE sessionId = '" + sessionId + "' ORDER BY DESC LIMIT 250 OFFSET 0",
		database='vr_data_test'
	)
	points = data_influx.get_points()
	analog_list = []
	time_list = []
	for p in points:
		analog_list.append(p['band7'])
		yourdate = dateutil.parser.parse(p['time'])
		yourtime = yourdate.timestamp()
		time_list.append(yourtime)
	analog_list.reverse()
	time_list.reverse()
	data = np.array(analog_list)
	datetime_data = np.array(time_list)

	prepared_data = {
		'band_rel': analog_list
	}


	series = pd.DataFrame(prepared_data, columns = ['band_rel'], index=time_list)
	# print(series.head())
	autocorrelation_plot(series)
	series.plot()
	pyplot.show()

	model = ARIMA(series, order=(5, 1, 0))
	model_fit = model.fit(disp=0)
	print(model_fit.summary())
	output = model_fit.forecast(steps=10)
	print(output)
	# plot residual errors
	residuals = pd.DataFrame(model_fit.resid)
	residuals.plot()
	pyplot.show()
	residuals.plot(kind='kde')
	pyplot.show()
	print(residuals.describe())

	# X = series.values
	# size = int(len(X) * 0.66)
	# train, test = X[0:size], X[size:len(X)]
	# history = [x for x in train]
	# predictions = list()
	# for t in range(len(test)):
	# 	model = ARIMA(history, order=(5, 1, 0))
	# 	model_fit = model.fit(disp=0)
	# 	output = model_fit.forecast()
	# 	yhat = output[0]
	# 	predictions.append(yhat)
	# 	obs = test[t]
	# 	history.append(obs)
	# 	print('predicted=%f, expected=%f' % (yhat, obs))
	# error = mean_squared_error(test, predictions)
	# print('Test MSE: %.3f' % error)
	# # plot
	# pyplot.plot(test)
	# pyplot.plot(predictions, color='red')
	# pyplot.show()