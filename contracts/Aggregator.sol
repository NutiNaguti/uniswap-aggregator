// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/PancakeSwap/IPancakeRouter02.sol";
import "./interfaces/PancakeSwap/IPancakeFactory.sol";  

contract Aggregator {
    address[] public routers;
    // address[] public connectors;

    constructor(address[] memory _routers) {
        routers = _routers;
    }

    /**
        Gets router* and path* that give max output amount with input amount and tokens
        @param amountIn input amount
        @param tokenIn source token
        @param tokenOut destination token
        return max output amount and router and path, that give this output amount

        router* - Uniswap-like Router
        path* - token list to swap
     */
    function quote(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    )
        external
        view
        returns (
            uint256 amountOut,
            address routerAddress,
            address[] memory path
        )
    {
        require(amountIn > 0, "Aggregator: amountIn must be greather than 0");
        require(tokenIn != address(0), "Aggregator: tokenIn addres cannot be 0x0");
        require(tokenOut != address(0), "Aggregator: tokenOut address cannot be 0x0");

        path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        uint256 tmp;

        for (uint256 i = 0; i < routers.length; i++) {
            IPancakeRouter02 router = IPancakeRouter02(routers[i]);
            IPancakeFactory factory = IPancakeFactory(router.factory());
            address pair = factory.getPair(tokenIn, tokenOut);

            if (pair == address(0)) { 
                continue;
            }

            uint256[] memory amounts = router.getAmountsOut(amountIn, path);
            tmp = amounts[1];

            if (tmp > amountOut) {
                amountOut = tmp;
                routerAddress = address(router);
            }
        }
    }

    /**
        Swaps tokens on router with path, should check slippage
        @param amountIn input amount
        @param amountOutMin minumum output amount
        @param routerAddress Uniswap-like router to swap tokens on
        @param path tokens list to swap
        return actual output amount
     */
    function swap(
        uint256 amountIn,
        uint256 amountOutMin,
        address routerAddress,
        address[] memory path
    ) external returns (uint256 amountOut) {
        require(path.length >= 2, "Aggregator: path too short");
        require(amountIn > 0, "Aggregator: amountIn must be greather than 0");
        require(path[0] != address(0), "Aggregator: tokenIn address cannot be 0x0");

        IERC20 inputToken = IERC20(path[0]);
        require(inputToken.allowance(msg.sender, address(this)) == amountIn, "Aggregator: not enougth allowance");
        inputToken.transferFrom(msg.sender, address(this), amountIn);

        bool successfulApproved = inputToken.approve(routerAddress, amountIn);
        require(successfulApproved, "Aggregator: approve failed");

        IPancakeRouter02 router = IPancakeRouter02(routerAddress);
        
        uint256 deadline = block.timestamp + 30;
        uint256[] memory amountsOut = router.swapExactTokensForTokens(amountIn, amountOutMin, path, msg.sender, deadline);
        amountOut = amountsOut[amountsOut.length - 1];
    }
}
