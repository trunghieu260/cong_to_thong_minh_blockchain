// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SmartMeter {

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    struct Customer {
        uint customerId;
        string fullName;
        string meterId;
        address wallet;
        bool exists;
    }

    struct Reading {
        uint readingId;
        string meterId;
        uint electricValue;
        uint timestamp;
    }

    struct Bill {
        uint billId;
        string meterId;
        uint month;
        uint year;
        uint totalUnit;
        uint amount;
        bool paid;
        uint paidTime;
    }

    uint public customerCount;
    uint public readingCount;
    uint public billCount;

    mapping(uint => Customer) public customers;
    mapping(uint => Reading) public readings;
    mapping(uint => Bill) public bills;

    event CustomerAdded(
        uint customerId,
        string fullName,
        string meterId,
        address wallet
    );

    event ReadingAdded(
        uint readingId,
        string meterId,
        uint electricValue,
        uint timestamp
    );

    event BillCreated(
        uint billId,
        string meterId,
        uint amount
    );

    event BillPaid(
        uint billId,
        address payer,
        uint amount
    );

    function addCustomer(
        string memory _name,
        string memory _meterId,
        address _wallet
    )
        public
        onlyOwner
    {
        customerCount++;

        customers[customerCount] = Customer(
            customerCount,
            _name,
            _meterId,
            _wallet,
            true
        );

        emit CustomerAdded(
            customerCount,
            _name,
            _meterId,
            _wallet
        );
    }

    function getCustomer(
        uint id
    )
        public
        view
        returns(
            uint,
            string memory,
            string memory,
            address,
            bool
        )
    {
        Customer memory c = customers[id];

        return(
            c.customerId,
            c.fullName,
            c.meterId,
            c.wallet,
            c.exists
        );
    }

    function addReading(
        string memory _meterId,
        uint _value
    )
        public
        onlyOwner
    {
        readingCount++;

        readings[readingCount] = Reading(
            readingCount,
            _meterId,
            _value,
            block.timestamp
        );

        emit ReadingAdded(
            readingCount,
            _meterId,
            _value,
            block.timestamp
        );
    }

    function getReading(
        uint id
    )
        public
        view
        returns(
            uint,
            string memory,
            uint,
            uint
        )
    {
        Reading memory r = readings[id];

        return(
            r.readingId,
            r.meterId,
            r.electricValue,
            r.timestamp
        );
    }    function createBill(
        string memory _meterId,
        uint _month,
        uint _year,
        uint _totalUnit,
        uint _amount
    )
        public
        onlyOwner
    {
        billCount++;

        bills[billCount] = Bill(
            billCount,
            _meterId,
            _month,
            _year,
            _totalUnit,
            _amount,
            false,
            0
        );

        emit BillCreated(
            billCount,
            _meterId,
            _amount
        );
    }


    function getBill(
        uint id
    )
        public
        view
        returns(
            uint,
            string memory,
            uint,
            uint,
            uint,
            uint,
            bool,
            uint
        )
    {
        Bill memory b = bills[id];

        return(
            b.billId,
            b.meterId,
            b.month,
            b.year,
            b.totalUnit,
            b.amount,
            b.paid,
            b.paidTime
        );
    }


    /*
        Thanh toán hóa đơn bằng ETH

        Ví dụ:
        Hóa đơn:
        0.001 ETH

        Người dùng mở MetaMask
        gửi đúng số ETH
        Contract cập nhật paid = true
    */

    function payBill(
        uint _billId
    )
        public
        payable
    {

        Bill storage b = bills[_billId];


        require(
            b.billId != 0,
            "Bill not found"
        );


        require(
            b.paid == false,
            "Bill already paid"
        );


        require(
            msg.value >= b.amount,
            "Not enough ETH"
        );


        b.paid = true;

        b.paidTime = block.timestamp;


        emit BillPaid(
            _billId,
            msg.sender,
            msg.value
        );


        // trả lại ETH dư nếu có

        if(msg.value > b.amount)
        {
            payable(msg.sender).transfer(
                msg.value - b.amount
            );
        }
    }



    function getBillStatus(
        uint _billId
    )
        public
        view
        returns(bool)
    {

        require(
            bills[_billId].billId != 0,
            "Bill not found"
        );


        return bills[_billId].paid;
    }



    function getLatestReading()
        public
        view
        returns(
            string memory,
            uint,
            uint
        )
    {

        require(
            readingCount > 0,
            "No reading"
        );


        Reading memory r =
            readings[readingCount];


        return(
            r.meterId,
            r.electricValue,
            r.timestamp
        );
    }



    function getLatestBill()
        public
        view
        returns(
            string memory,
            uint,
            bool
        )
    {

        require(
            billCount > 0,
            "No bill"
        );


        Bill memory b =
            bills[billCount];


        return(
            b.meterId,
            b.amount,
            b.paid
        );
    }
    // ==============================
    // Lấy toàn bộ danh sách khách hàng
    // ==============================

    function getAllCustomers()
        public
        view
        returns(Customer[] memory)
    {

        Customer[] memory result =
            new Customer[](customerCount);


        for(uint i = 0; i < customerCount; i++)
        {
            result[i] =
                customers[i + 1];
        }


        return result;
    }



    // ==============================
    // Lấy toàn bộ lịch sử điện
    // ==============================

    function getAllReadings()
        public
        view
        returns(Reading[] memory)
    {

        Reading[] memory result =
            new Reading[](readingCount);


        for(uint i = 0; i < readingCount; i++)
        {
            result[i] =
                readings[i + 1];
        }


        return result;
    }



    // ==============================
    // Lấy toàn bộ hóa đơn
    // ==============================

    function getAllBills()
        public
        view
        returns(Bill[] memory)
    {

        Bill[] memory result =
            new Bill[](billCount);


        for(uint i = 0; i < billCount; i++)
        {
            result[i] =
                bills[i + 1];
        }


        return result;
    }



    // ==============================
    // Thay đổi quyền Admin
    // ==============================

    function changeOwner(
        address newOwner
    )
        public
        onlyOwner
    {

        require(
            newOwner != address(0),
            "Invalid address"
        );


        owner = newOwner;
    }



    // ==============================
    // Nhận ETH
    // ==============================

    receive()
        external
        payable
    {

    }



    // ==============================
    // Rút ETH về ví Admin
    // ==============================

    function withdraw()
        public
        onlyOwner
    {

        payable(owner)
            .transfer(
                address(this).balance
            );
    }



    // ==============================
    // Kiểm tra số dư Contract
    // ==============================

    function getBalance()
        public
        view
        returns(uint)
    {

        return address(this).balance;
    }



}