import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CurrencyPipe } from '@angular/common';
import { MatTableDataSource } from '@angular/material/table';
import { debounce, debounceTime, subscribeOn } from 'rxjs';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';

@Component({
  selector: 'app-table-view',
  templateUrl: './table-view.component.html',
  styleUrls: ['./table-view.component.scss']
})
export class TableViewComponent implements OnInit {

  constructor(private currencyPipe: CurrencyPipe, private fb: FormBuilder, private dialogRef: MatDialog) { 

  }

  coinAssestData: any;
  rawCoinAssesDataArr: any;
  displayedColumns: any = ['rank', 'symbol', 'name', 'price', 'marketCap', 'add', 'detail', 'change'];
  walletColumns: any = ['name', 'price', 'amountOwned', 'add', 'remove', 'change'];
  walletColums: any = ['name', 'symbol',]
  form: FormGroup = this.fb.group({
    search: ['']
  });
  walletArr: any = [];
  personalBalance: any = 0;
  WalletDataSource: any;

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  ngOnInit() {
    this.fetchAssestData().then(() => {
      this.transformData(this.rawCoinAssesDataArr);
    })

    this.checkForSession();
  }

  checkForSession() {
    if (window.localStorage && localStorage.length > 0) {
      const walletTable: any = localStorage.getItem('walletStorage');
      this.WalletDataSource = new MatTableDataSource(JSON.parse(walletTable));
      this.personalBalance = localStorage.getItem('personalBalance');
    }
  }

  async fetchAssestData() {
    await fetch('https://api.coincap.io/v2/assets').then(result => result.json()).then(data => {
      this.rawCoinAssesDataArr = data?.data ? data.data : null;
    });
  }

  filterTable(event: Event) {
    this.form.get('search')?.valueChanges.pipe(debounceTime(50)).subscribe((value) => {
      this.coinAssestData.filter = this.form.get('search')?.value.trim().toLocaleLowerCase();
    });
  }

  transformData(coinDataArray: any) {
    let tableData: any = [];
    coinDataArray.forEach((element: any) => {
      let newCoinObj: any = {
        id: element.id,
        amountOwned: 0,
        rawPrice: element.priceUsd,
        rank: element.rank,
        name: element.name,
        symbol: element.symbol,
        price: `${this.currencyPipe.transform(element.priceUsd)}`,
        marketCap: this.currencyPipe.transform(element.marketCapUsd),
        changePercentage: parseFloat(element.changePercent24Hr).toFixed(2),
        vwap: `${this.currencyPipe.transform(element.vwap24Hr)}`,
        supply: parseFloat(element.supply).toLocaleString(),
        volume: parseFloat(element.volumeUsd24Hr).toLocaleString()
      }
      newCoinObj.changePos =  newCoinObj.changePercentage > 0 ? true : false;
      tableData.push(newCoinObj);
    });

    this.coinAssestData = new MatTableDataSource(tableData);
    this.coinAssestData.sort = this.sort;
    this.coinAssestData.paginator = this.paginator;
    this.coinAssestData.filterPredicate = (
      data: { symbol: string, name: string },
      filter: string
    ) => {
      return data.name.trim().toLocaleLowerCase().includes(filter) || data.symbol.trim().toLocaleLowerCase().includes(filter);
    }
  }


  viewCoinDetails(coin: any) {
    const params = new MatDialogConfig();
    params.data = { Coin: coin, rawCoinDetails: this.rawCoinAssesDataArr, type: 'Details' };
    const dialogRef = this.dialogRef.open(ModalDialogComponent, { height: '85%', width: '80%', data: params });
  }

  addCoinToWallet(coin: any) {
    const params = new MatDialogConfig();
    params.data = { Coin: coin, type: 'Add' };
    const dialogRef = this.dialogRef.open(ModalDialogComponent, { height: '22%', width: '25%', data: params });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (coin.amountOwned === 0) {
          this.walletArr.push(coin);
          this.WalletDataSource = new MatTableDataSource(this.walletArr);
        }
        coin.amountOwned += parseFloat(result);
        this.personalBalance += coin.rawPrice * result
        this.setSession();
      }
    });
  }

  setSession() {
    if (localStorage.length > 0) {
      localStorage.clear();
      localStorage.setItem('walletStorage', JSON.stringify(this.WalletDataSource.data));
      localStorage.setItem('personalBalance', this.personalBalance);
    } else {
      localStorage.setItem('walletStorage', JSON.stringify(this.WalletDataSource.data));
      localStorage.setItem('personalBalance', this.personalBalance);
    }
  }

  remiveCoinFromWallet(coin: any) {
    const params = new MatDialogConfig();
    params.data = { Coin: coin, type: 'Remove' };
    const dialogRef = this.dialogRef.open(ModalDialogComponent, { height: '22%', width: '25%', data: params });


    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        coin.amountOwned -= result;
        if (coin.amountOwned === 0) {
          this.walletArr = this.walletArr.filter((walletCoin: any) => walletCoin.name !== coin.name);
          this.WalletDataSource = this.walletArr ? new MatTableDataSource(this.walletArr) : null;
        }
        this.personalBalance -= coin.rawPrice * result
        this.setSession();
      } 
    });
  }

  getBalance() {
    return `${this.currencyPipe.transform(this.personalBalance)}`
  }

}
