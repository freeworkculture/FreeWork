"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var json_schemas_1 = require("@0x/json-schemas");
var utils_1 = require("@0x/utils");
var _ = require("lodash");
var assert_1 = require("./assert");
var constants_1 = require("./constants");
exports.marketUtils = {
    /**
     * Takes an array of orders and returns a subset of those orders that has enough makerAssetAmount
     * in order to fill the input makerAssetFillAmount plus slippageBufferAmount. Iterates from first order to last order.
     * Sort the input by ascending rate in order to get the subset of orders that will cost the least ETH.
     * @param   orders                      An array of objects that extend the Order interface. All orders should specify the same makerAsset.
     *                                      All orders should specify WETH as the takerAsset.
     * @param   makerAssetFillAmount        The amount of makerAsset desired to be filled.
     * @param   opts                        Optional arguments this function accepts.
     * @return  Resulting orders and remaining fill amount that could not be covered by the input.
     */
    findOrdersThatCoverMakerAssetFillAmount: function (orders, makerAssetFillAmount, opts) {
        assert_1.assert.doesConformToSchema('orders', orders, json_schemas_1.schemas.ordersSchema);
        assert_1.assert.isValidBaseUnitAmount('makerAssetFillAmount', makerAssetFillAmount);
        // try to get remainingFillableMakerAssetAmounts from opts, if it's not there, use makerAssetAmount values from orders
        var remainingFillableMakerAssetAmounts = _.get(opts, 'remainingFillableMakerAssetAmounts', _.map(orders, function (order) { return order.makerAssetAmount; }));
        _.forEach(remainingFillableMakerAssetAmounts, function (amount, index) {
            return assert_1.assert.isValidBaseUnitAmount("remainingFillableMakerAssetAmount[" + index + "]", amount);
        });
        assert_1.assert.assert(orders.length === remainingFillableMakerAssetAmounts.length, 'Expected orders.length to equal opts.remainingFillableMakerAssetAmounts.length');
        // try to get slippageBufferAmount from opts, if it's not there, default to 0
        var slippageBufferAmount = _.get(opts, 'slippageBufferAmount', constants_1.constants.ZERO_AMOUNT);
        assert_1.assert.isValidBaseUnitAmount('opts.slippageBufferAmount', slippageBufferAmount);
        // calculate total amount of makerAsset needed to be filled
        var totalFillAmount = makerAssetFillAmount.plus(slippageBufferAmount);
        // iterate through the orders input from left to right until we have enough makerAsset to fill totalFillAmount
        var result = _.reduce(orders, function (_a, order, index) {
            var resultOrders = _a.resultOrders, remainingFillAmount = _a.remainingFillAmount, ordersRemainingFillableMakerAssetAmounts = _a.ordersRemainingFillableMakerAssetAmounts;
            if (remainingFillAmount.lessThanOrEqualTo(constants_1.constants.ZERO_AMOUNT)) {
                return {
                    resultOrders: resultOrders,
                    remainingFillAmount: constants_1.constants.ZERO_AMOUNT,
                    ordersRemainingFillableMakerAssetAmounts: ordersRemainingFillableMakerAssetAmounts,
                };
            }
            else {
                var makerAssetAmountAvailable = remainingFillableMakerAssetAmounts[index];
                var shouldIncludeOrder = makerAssetAmountAvailable.gt(constants_1.constants.ZERO_AMOUNT);
                // if there is no makerAssetAmountAvailable do not append order to resultOrders
                // if we have exceeded the total amount we want to fill set remainingFillAmount to 0
                return {
                    resultOrders: shouldIncludeOrder ? _.concat(resultOrders, order) : resultOrders,
                    ordersRemainingFillableMakerAssetAmounts: shouldIncludeOrder
                        ? _.concat(ordersRemainingFillableMakerAssetAmounts, makerAssetAmountAvailable)
                        : ordersRemainingFillableMakerAssetAmounts,
                    remainingFillAmount: utils_1.BigNumber.max(constants_1.constants.ZERO_AMOUNT, remainingFillAmount.minus(makerAssetAmountAvailable)),
                };
            }
        }, {
            resultOrders: [],
            remainingFillAmount: totalFillAmount,
            ordersRemainingFillableMakerAssetAmounts: [],
        });
        return result;
    },
    /**
     * Takes an array of orders and an array of feeOrders. Returns a subset of the feeOrders that has enough ZRX
     * in order to fill the takerFees required by orders plus a slippageBufferAmount.
     * Iterates from first feeOrder to last. Sort the feeOrders by ascending rate in order to get the subset of
     * feeOrders that will cost the least ETH.
     * @param   orders      An array of objects that extend the Order interface. All orders should specify ZRX as
     *                      the makerAsset and WETH as the takerAsset.
     * @param   feeOrders   An array of objects that extend the Order interface. All orders should specify ZRX as
     *                      the makerAsset and WETH as the takerAsset.
     * @param   opts        Optional arguments this function accepts.
     * @return  Resulting orders and remaining fee amount that could not be covered by the input.
     */
    findFeeOrdersThatCoverFeesForTargetOrders: function (orders, feeOrders, opts) {
        assert_1.assert.doesConformToSchema('orders', orders, json_schemas_1.schemas.ordersSchema);
        assert_1.assert.doesConformToSchema('feeOrders', feeOrders, json_schemas_1.schemas.ordersSchema);
        // try to get remainingFillableMakerAssetAmounts from opts, if it's not there, use makerAssetAmount values from orders
        var remainingFillableMakerAssetAmounts = _.get(opts, 'remainingFillableMakerAssetAmounts', _.map(orders, function (order) { return order.makerAssetAmount; }));
        _.forEach(remainingFillableMakerAssetAmounts, function (amount, index) {
            return assert_1.assert.isValidBaseUnitAmount("remainingFillableMakerAssetAmount[" + index + "]", amount);
        });
        assert_1.assert.assert(orders.length === remainingFillableMakerAssetAmounts.length, 'Expected orders.length to equal opts.remainingFillableMakerAssetAmounts.length');
        // try to get remainingFillableFeeAmounts from opts, if it's not there, use makerAssetAmount values from feeOrders
        var remainingFillableFeeAmounts = _.get(opts, 'remainingFillableFeeAmounts', _.map(feeOrders, function (order) { return order.makerAssetAmount; }));
        _.forEach(remainingFillableFeeAmounts, function (amount, index) {
            return assert_1.assert.isValidBaseUnitAmount("remainingFillableFeeAmounts[" + index + "]", amount);
        });
        assert_1.assert.assert(feeOrders.length === remainingFillableFeeAmounts.length, 'Expected feeOrders.length to equal opts.remainingFillableFeeAmounts.length');
        // try to get slippageBufferAmount from opts, if it's not there, default to 0
        var slippageBufferAmount = _.get(opts, 'slippageBufferAmount', constants_1.constants.ZERO_AMOUNT);
        assert_1.assert.isValidBaseUnitAmount('opts.slippageBufferAmount', slippageBufferAmount);
        // calculate total amount of ZRX needed to fill orders
        var totalFeeAmount = _.reduce(orders, function (accFees, order, index) {
            var makerAssetAmountAvailable = remainingFillableMakerAssetAmounts[index];
            var feeToFillMakerAssetAmountAvailable = makerAssetAmountAvailable
                .mul(order.takerFee)
                .dividedToIntegerBy(order.makerAssetAmount);
            return accFees.plus(feeToFillMakerAssetAmountAvailable);
        }, constants_1.constants.ZERO_AMOUNT);
        var _a = exports.marketUtils.findOrdersThatCoverMakerAssetFillAmount(feeOrders, totalFeeAmount, {
            remainingFillableMakerAssetAmounts: remainingFillableFeeAmounts,
            slippageBufferAmount: slippageBufferAmount,
        }), resultOrders = _a.resultOrders, remainingFillAmount = _a.remainingFillAmount, ordersRemainingFillableMakerAssetAmounts = _a.ordersRemainingFillableMakerAssetAmounts;
        return {
            resultFeeOrders: resultOrders,
            remainingFeeAmount: remainingFillAmount,
            feeOrdersRemainingFillableMakerAssetAmounts: ordersRemainingFillableMakerAssetAmounts,
        };
        // TODO: add more orders here to cover rounding
        // https://github.com/0xProject/0x-protocol-specification/blob/master/v2/forwarding-contract-specification.md#over-buying-zrx
    },
};
//# sourceMappingURL=market_utils.js.map